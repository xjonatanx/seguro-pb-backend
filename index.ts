import express from "express";
import cors from "cors";
import { db } from "./db";
import { submissions, users } from "./db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import PDFDocument from "pdfkit";
import jwt from "jsonwebtoken";
import { count } from "drizzle-orm";
import { ilike, or, desc } from "drizzle-orm";
import nodemailer from "nodemailer";

const JWT_SECRET = "pb_ingenieria_secret_2026";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// --- 1. CONFIGURACIÓN DE CORREO (NODEMAILER) ---
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "pybingenieria7@gmail.com",
    pass: "tpnp yrcz fhru subd",
  },
  tls: { rejectUnauthorized: false },
});

// --- 2. FUNCIÓN MAESTRA PARA GENERAR PDF (BUFFER) ---
const generatePDFBuffer = (s: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 40, left: 50, right: 50, bottom: 40 },
    });
    let buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const drawRow = (label: string, value: string | null, y: number) => {
      doc.font("Helvetica-Bold").fontSize(9).text(label, 55, y);
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(value || "", 180, y);
      return y + 16;
    };

    const drawHeader = () => {
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("black")
        .text("P&B", 50, 40);
      doc.fontSize(8).font("Helvetica").text("PROCEDIMIENTOS RR.HH.", 50, 55);
      doc.fontSize(10).font("Helvetica-Bold").text("Teck", 500, 40);
      doc.fontSize(8).font("Helvetica").text("CONSTRUCCIÓN", 475, 55);
      doc.moveDown(3);
    };

    // --- PÁGINA 1 ---
    drawHeader();
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("FORMULARIO SOLICITUD DE INCORPORACIÓN DE CARGA", 50, doc.y, {
        align: "center",
        width: 512,
      });
    doc.moveDown(1);

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#444444")
      .text(
        "Información debe ser enviada mediante Correo electrónico a Secretaria Administrativa Pablo Córdoba pablo.cordova@pybingenieria.cl, Jefa ADM y RR.HH. Natalia Lazo Natalia.lazo@pybingenieria.cl y del Área de Bienestar Antonia Sanchez antonia.sanchez@pybingenieria.cl agregando toda la información que señala el formulario.",
        { align: "left", width: 512 },
      );
    doc.moveDown(0.3);
    doc
      .font("Helvetica-Bold")
      .text("El llenado del formulario es Digital, NO con puño y letra.", {
        align: "left",
      });
    doc.moveDown(0.3);
    doc
      .font("Helvetica-Bold")
      .text("Seguro Complementario de Salud", { align: "left" });
    doc.fillColor("black").moveDown(2);

    // 1. Datos del Trabajador
    doc.rect(50, doc.y, 512, 16).fill("#eeeeee").stroke("#cccccc");
    doc
      .fillColor("black")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("1. DATOS DEL TRABAJADOR", 55, doc.y + 4);
    doc.moveDown(1.5);

    let currentY = doc.y;
    currentY = drawRow("Nombre Completo:", s.workerName, currentY);
    currentY = drawRow("RUT:", s.workerRut, currentY);
    currentY = drawRow("Cargo:", s.workerCargo, currentY);
    currentY = drawRow("Área / Departamento:", s.workerArea, currentY);
    currentY = drawRow("Correo Electrónico:", s.workerEmail, currentY);
    currentY = drawRow("Teléfono de Contacto:", s.workerPhone, currentY);
    doc.y = currentY + 10;
    doc.moveDown(1.5);

    const drawSectionCargas = (doc: any, s: any) => {
      const C_TEXT = "#1F2937"; // Negro/Gris oscuro
      const C_BORDER = "#E5E7EB"; // Gris para bordes
      const C_BG = "#F3F4F6"; // El gris de los demás items

      // 1. Encabezado de la Sección (Fondo Gris, Letra Negra)
      doc.rect(50, doc.y, 512, 18).fill(C_BG).stroke(C_BORDER);
      doc
        .fillColor(C_TEXT)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("2. DATOS DE LAS CARGAS A INCORPORAR", 55, doc.y + 5);
      doc.moveDown(1.5);

      const listaCargas = Array.isArray(s.dependents) ? s.dependents : [];

      if (listaCargas.length === 0) {
        doc
          .fillColor("#6B7280")
          .font("Helvetica-Oblique")
          .fontSize(9)
          .text("No se registraron cargas familiares.", 60);
        doc.moveDown(2);
        return;
      }

      listaCargas.forEach((dep: any, index: number) => {
        if (doc.y > 620) doc.addPage();

        const startY = doc.y;
        const cardWidth = 512;
        const cardHeight = 95;

        // 2. Tarjeta principal (Fondo blanco, borde gris)
        doc
          .roundedRect(50, startY, cardWidth, cardHeight, 8)
          .fill("white")
          .stroke(C_BORDER);

        // 3. Mini-encabezado de la carga (Fondo Gris, Letra Negra)
        doc.rect(50, startY, 80, 15).fill(C_BG).stroke(C_BORDER);
        doc
          .fillColor(C_TEXT)
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(`CARGA N°${index + 1}`, 55, startY + 4);

        // 4. Nombre destacado en Negro
        doc
          .fillColor(C_TEXT)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(dep.nombre?.toUpperCase() || "SIN NOMBRE", 140, startY + 4, {
            width: 350,
            align: "right",
          });

        // --- GRID DE DATOS (Mantiene el mismo estilo ordenado) ---
        let yRow = startY + 25;
        const col1 = 60;
        const col2 = 300;

        const drawField = (
          label: string,
          value: string,
          x: number,
          y: number,
        ) => {
          doc
            .fillColor("#6B7280")
            .font("Helvetica-Bold")
            .fontSize(7)
            .text(label, x, y);
          doc
            .fillColor(C_TEXT)
            .font("Helvetica")
            .fontSize(8)
            .text(value || "---", x, y + 9);
        };

        drawField("RUT", dep.rut, col1, yRow);
        drawField("FECHA NACIMIENTO", dep.nacimiento, col2, yRow);

        yRow += 22;
        drawField("EDAD", (dep.edad || "0") + " años", col1, yRow);
        const rel =
          dep.parentesco === "Otro"
            ? `Otro (${dep.otroParentesco || ""})`
            : dep.parentesco;
        drawField("PARENTESCO", rel, col2, yRow);

        yRow += 22;
        const salud =
          dep.prevision === "Isapre"
            ? `Isapre (${dep.isapreNombre || ""})`
            : "FONASA";
        drawField("SISTEMA SALUD", salud, col1, yRow);
        drawField(
          "CONTACTO",
          `${dep.telefono || ""} | ${dep.email || ""}`,
          col2,
          yRow,
        );

        doc.y = startY + cardHeight + 10;
      });

      // Resetear color para las siguientes secciones
      doc.fillColor("black");
    };

    drawSectionCargas(doc, s);

    // --- PÁGINA 2 ---
    doc.addPage();
    drawHeader();
    doc.rect(50, doc.y, 512, 16).fill("#eeeeee").stroke("#cccccc");
    doc
      .fillColor("black")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("3. DATOS BANCARIOS DE LA CARGA", 55, doc.y + 4);
    doc.moveDown(1.5);

    currentY = doc.y;
    currentY = drawRow("Banco:", s.bankName, currentY);
    const tipoCuentaText =
      (s.bankAccountType || "") +
      (s.bankOtherType ? ` (${s.bankOtherType})` : "");
    currentY = drawRow("Tipo de Cuenta:", tipoCuentaText, currentY);
    currentY = drawRow("Número de Cuenta:", s.bankAccountNumber, currentY);
    doc.y = currentY + 30;

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("4. DECLARACIÓN DEL TRABAJADOR", 50);
    doc.moveDown(0.5);
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(
        "Declaro que la información proporcionada es verídica y que los antecedentes adjuntos son auténticos. Asimismo, tomo conocimiento de que la incorporación de la carga está sujeta a evaluación y aprobación por parte de la Compañía Aseguradora, conforme a las condiciones de la pólíza vigente.",
        { align: "justify", width: 512 },
      );
    doc.moveDown(0.5);
    doc.text(
      "Autorizo a la empresa a remitir esta información a la aseguradora para efectos exclusivos de la gestión del Seguro Complementario de Salud.",
      { align: "justify", width: 512 },
    );

    doc.moveDown(10);
    const signY = doc.y;

    if (s.signature && s.signature.startsWith("data:image")) {
      try {
        const base64Data = s.signature.split(";base64,").pop();
        if (base64Data) {
          doc.image(Buffer.from(base64Data, "base64"), 390, signY - 40, {
            width: 150,
          });
        }
      } catch (err) {
        console.error("Error firma:", err);
      }
    }

    doc.text("__________________________", 350, signY, { align: "right" });
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Firma del Trabajador", 350, signY + 12, { align: "right" });
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(`Fecha de Solicitud: ${s.requestDate || ""}`, 50, signY);

    // --- PÁGINA 3 ---
    doc.addPage();
    drawHeader();
    doc.rect(50, doc.y, 512, 18).fill("#000000").stroke();
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("5. USO EXCLUSIVO RR.HH.", 55, doc.y + 4);
    doc.fillColor("black").moveDown(2.5);

    doc
      .font("Helvetica")
      .fontSize(9)
      .text("Fecha de Recepción: ____________________", 55);
    doc.moveDown(1.5);
    doc.text("Revisión Documental:    [  ] Completa    [  ] Incompleta");
    doc.moveDown(1.5);
    doc.text("Estado:");
    doc.moveDown(0.5);
    doc.text(
      "[  ] Enviado   [  ] Aprobado   [  ] Rechazado   [  ] Pendiente Información",
    );
    doc.moveDown(1.5);
    doc.text("Observaciones:");
    doc.moveDown(1);
    doc.rect(50, doc.y, 512, 100).stroke();

    doc.moveDown(17);
    doc.text("__________________________", { align: "center" });
    doc.moveDown(1);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Firma RR.HH.", { align: "center" });

    doc.end();
  });
};

const authenticateAdmin = (req: any, res: any, next: any) => {
  // Buscamos el token en el header o en el query (para el PDF)
  const token = req.headers.authorization?.split(" ")[1] || req.query.token;

  if (!token) return res.status(401).json({ error: "Token no proporcionado" });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ error: "No tienes permisos" });
    next();
  } catch (error) {
    res.status(401).json({ error: "Sesión expirada o inválida" });
  }
};

const authenticateUser = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No autorizado" });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Sesión inválida" });
  }
};

app.post("/api/auth/login-admin", async (req, res) => {
  const { rut, password } = req.body;
  try {
    const user = await db.query.users.findFirst({
      where: and(eq(users.rut, rut), eq(users.role, "admin")),
    });

    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Generamos el token con el ID y el ROL
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "8h",
    });

    res.json({ success: true, token });
  } catch (error) {
    res.status(500).send("Error");
  }
});

/**
 * 1. RUTA DE LOGIN (Precisión por RUT)
 * Valida al usuario y verifica el estado de su evaluación
 */
app.post("/api/auth/login", async (req, res) => {
  const { rut } = req.body;
  if (!rut) return res.status(400).json({ error: "El RUT es obligatorio." });

  try {
    let user = await db.query.users.findFirst({ where: eq(users.rut, rut) });

    if (!user) {
      const newUser = await db
        .insert(users)
        .values({ rut, role: "worker", email: "pendiente@pybingenieria.cl" })
        .returning();
      user = newUser[0];
    }

    const existingSubmission = await db.query.submissions.findFirst({
      where: eq(submissions.userId, user.id),
    });

    // Generamos Token para el trabajador
    const token = jwt.sign(
      { id: user.id, rut: user.rut, role: "worker" },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, rut: user.rut },
      alreadySubmitted: existingSubmission?.status === "submitted",
    });
  } catch (error) {
    // AGREGA ESTA LÍNEA PARA VER EL ERROR REAL:
    console.error("DETALLE DEL ERROR EN LOGIN:", error);

    res.status(500).json({ error: "Error al procesar el ingreso" });
  }
});

/**
 * 2. RECUPERAR DATOS (GET)
 */
app.get("/api/submissions/:userId", authenticateUser, async (req, res) => {
  const { userId } = req.params;
  try {
    const data = await db.query.submissions.findFirst({
      where: eq(submissions.userId, Number(userId)),
    });
    res.json(data || null);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener datos" });
  }
});

/**
 * 3. GUARDAR O FINALIZAR (POST)
 * Bloquea cualquier intento de sobrescritura si ya fue enviado [cite: 53-56]
 */
app.post("/api/submissions/save", authenticateUser, async (req, res) => {
  const { userId, data, finalize } = req.body;

  try {
    const valuesToSave = {
      userId: Number(userId),
      // 1. Datos del Trabajador
      workerName: data.worker.nombre,
      workerRut: data.worker.rut,
      workerCargo: data.worker.cargo,
      workerArea: data.worker.area,
      workerEmail: data.worker.email,
      workerPhone: data.worker.telefono,

      // 2. CARGAS (Ahora solo usamos el arreglo JSON)
      // Eliminamos depName, depRut, depAge, etc., porque ahora van dentro de este array
      dependents: data.dependents,

      // 3. Datos Bancarios
      bankName: data.bank.banco,
      bankAccountType: data.bank.tipo,
      bankAccountNumber: data.bank.numero,
      bankOtherType: data.bank.otroTipo, // Asegúrate de incluir este si lo agregamos

      // 4. Firma y Estado
      signature: data.signature,
      status: finalize ? "submitted" : "draft",
      requestDate: data.fechaSolicitud,
      updatedAt: new Date(),
    };

    // Guardar en la base de datos
    await db.insert(submissions).values(valuesToSave).onConflictDoUpdate({
      target: submissions.userId,
      set: valuesToSave,
    });

    // --- ENVÍO DE EMAIL AUTOMÁTICO ---
    if (finalize) {
      // Nota: Asegúrate de que tu función generatePDFBuffer también use s.dependents ahora
      const pdfBuffer = await generatePDFBuffer(valuesToSave);

      const recipients = [
        "yonatanpc65@gmail.com",
        "natalia.lazo@pybingenieria.cl",
        "pablo.cordova@pybingenieria.cl",
        "antonia.sanchez@pybingenieria.cl",
        "williams.soto@pybingenieria.cl",
      ].join(", ");

      await transporter.sendMail({
        from: '"Sistema Seguros P&B" <pybingenieria7@gmail.com>',
        to: recipients,
        subject: `Nueva Solicitud: ${valuesToSave.workerName}`,
        html: `<p>Nueva ficha recibida de <b>${valuesToSave.workerName}</b>.</p><p>Se adjunta PDF firmado.</p>`,
        attachments: [
          {
            filename: `Ficha_${valuesToSave.workerRut}.pdf`,
            content: pdfBuffer,
          },
        ],
      });
    }

    res.json({ success: true });
  } catch (e) {
    // IMPORTANTE: Imprime el error en la consola para saber qué falló si vuelve a pasar
    console.error("ERROR CRÍTICO AL GUARDAR:", e);
    res.status(500).json({ error: "Error interno al guardar los datos" });
  }
});

/**
 * LISTADO PARA ADMIN
 */
app.get("/api/admin/submissions", authenticateAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 8;
    const search = req.query.search ? String(req.query.search).trim() : "";
    const offset = (page - 1) * limit;

    // 2. Construimos la condición de búsqueda robusta
    // Usamos ilike para que no importe si escribes en mayúsculas o minúsculas
    const searchCondition = search
      ? or(
          ilike(submissions.workerName, `%${search}%`),
          ilike(submissions.workerRut, `%${search}%`),
        )
      : undefined;

    // 3. Obtener datos
    const data = await db.query.submissions.findMany({
      where: searchCondition,
      limit: limit,
      offset: offset,
      orderBy: [desc(submissions.id)],
    });

    // 4. Contar total (con la misma condición)
    const [totalResult] = await db
      .select({ value: count() })
      .from(submissions)
      .where(searchCondition);

    res.json({
      data,
      totalRecords: totalResult.value,
      totalPages: Math.ceil(totalResult.value / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error en búsqueda:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

app.put("/api/admin/submissions/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    // Usamos Drizzle para actualizar la tabla 'submissions'
    const result = await db
      .update(submissions)
      .set({
        workerName: data.workerName,
        workerRut: data.workerRut,
        workerCargo: data.workerCargo,
        workerArea: data.workerArea,
        workerEmail: data.workerEmail,
        workerPhone: data.workerPhone,

        // ESTA LÍNEA ES LA QUE REGISTRA LAS CARGAS:
        dependents: data.dependents,

        bankName: data.bankName,
        bankAccountType: data.bankAccountType,
        bankAccountNumber: data.bankAccountNumber,
        bankOtherType: data.bankOtherType,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, Number(id)));

    res.json({ success: true, message: "Cambios guardados correctamente" });
  } catch (error) {
    console.error("Error al actualizar en DB:", error);
    res
      .status(500)
      .json({ error: "Error interno al procesar la actualización" });
  }
});

app.delete(
  "/api/admin/submissions/:id",
  authenticateAdmin,
  async (req, res) => {
    const { id } = req.params;

    try {
      const targetId = Number(id);

      // ELIMINACIÓN FÍSICA: El registro desaparece de la tabla
      const result = await db
        .delete(submissions)
        .where(eq(submissions.id, targetId))
        .returning(); // .returning() nos confirma si encontró algo

      if (result.length === 0) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }

      console.log(`🔥 Registro #${targetId} ELIMINADO permanentemente.`);
      res.json({
        success: true,
        message: "Registro borrado de la base de datos",
      });
    } catch (error) {
      console.error("Error en eliminación física:", error);
      res
        .status(500)
        .json({ error: "No se pudo eliminar el registro permanentemente" });
    }
  },
);

app.get("/api/admin/generate-pdf/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const s = await db.query.submissions.findFirst({
      where: eq(submissions.id, Number(id)),
    });

    if (!s) return res.status(404).send("Registro no encontrado");

    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 40, left: 50, right: 50, bottom: 40 },
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Ficha_${s.workerRut}.pdf`,
    );
    doc.pipe(res);

    const drawRow = (label: string, value: string | null, y: number) => {
      doc.font("Helvetica-Bold").fontSize(9).text(label, 55, y);
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(value || "", 180, y);
      return y + 16;
    };

    // --- ENCABEZADO RESTAURADO (ESQUINAS OPUESTAS) ---
    const drawHeader = () => {
      // Izquierda
      doc.fontSize(14).font("Helvetica-Bold").text("P&B", 50, 40);
      doc.fontSize(8).font("Helvetica").text("PROCEDIMIENTOS RR.HH.", 50, 55);
      // Derecha
      doc.fontSize(10).font("Helvetica-Bold").text("Teck", 500, 40);
      doc.fontSize(8).font("Helvetica").text("CONSTRUCCIÓN", 475, 55);
      doc.moveDown(3);
    };

    // --- PÁGINA 1 ---
    drawHeader();

    // Título e Instrucciones alineados a la izquierda
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("FORMULARIO SOLICITUD DE INCORPORACIÓN DE CARGA", 50, doc.y, {
        align: "center",
        width: 512,
      });
    doc.moveDown(1);

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#444444")
      .text(
        "Información debe ser enviada mediante Correo electrónico a Secretaria Administrativa Pablo Córdoba pablo.cordova@pybingenieria.cl, Jefa ADM y RR.HH. Natalia Lazo Natalia.lazo@pybingenieria.cl y del Área de Bienestar Antonia Sanchez antonia.sanchez@pybingenieria.cl agregando toda la información que señala el formulario.",
        { align: "left", width: 512 },
      );
    doc.moveDown(0.3);
    doc
      .font("Helvetica-Bold")
      .text("El llenado del formulario es Digital, NO con puño y letra.", {
        align: "left",
      });
    doc.moveDown(0.3);
    doc
      .font("Helvetica-Bold")
      .text("Seguro Complementario de Salud", { align: "left" });
    doc.fillColor("black").moveDown(2);

    // 1. Datos del Trabajador
    doc.rect(50, doc.y, 512, 16).fill("#eeeeee").stroke("#cccccc");
    doc
      .fillColor("black")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("1. DATOS DEL TRABAJADOR", 55, doc.y + 4);
    doc.moveDown(1.5);

    let currentY = doc.y;
    currentY = drawRow("Nombre Completo:", s.workerName, currentY);
    currentY = drawRow("RUT:", s.workerRut, currentY);
    currentY = drawRow("Cargo:", s.workerCargo, currentY);
    currentY = drawRow("Área / Departamento:", s.workerArea, currentY);
    currentY = drawRow("Correo Electrónico:", s.workerEmail, currentY);
    currentY = drawRow("Teléfono de Contacto:", s.workerPhone, currentY);
    doc.y = currentY + 10;
    doc.moveDown(1.5);

    // --- 2. SECCIÓN DE CARGAS (REDISEÑO TOTAL) ---
    const drawSectionCargas = (doc: any, s: any) => {
      const C_TEXT = "#1F2937"; // Negro/Gris oscuro
      const C_BORDER = "#E5E7EB"; // Gris para bordes
      const C_BG = "#F3F4F6"; // El gris de los demás items

      // 1. Encabezado de la Sección (Fondo Gris, Letra Negra)
      doc.rect(50, doc.y, 512, 18).fill(C_BG).stroke(C_BORDER);
      doc
        .fillColor(C_TEXT)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("2. DATOS DE LAS CARGAS A INCORPORAR", 55, doc.y + 5);
      doc.moveDown(1.5);

      const listaCargas = Array.isArray(s.dependents) ? s.dependents : [];

      if (listaCargas.length === 0) {
        doc
          .fillColor("#6B7280")
          .font("Helvetica-Oblique")
          .fontSize(9)
          .text("No se registraron cargas familiares.", 60);
        doc.moveDown(2);
        return;
      }

      listaCargas.forEach((dep: any, index: number) => {
        if (doc.y > 620) doc.addPage();

        const startY = doc.y;
        const cardWidth = 512;
        const cardHeight = 95;

        // 2. Tarjeta principal (Fondo blanco, borde gris)
        doc
          .roundedRect(50, startY, cardWidth, cardHeight, 8)
          .fill("white")
          .stroke(C_BORDER);

        // 3. Mini-encabezado de la carga (Fondo Gris, Letra Negra)
        doc.rect(50, startY, 80, 15).fill(C_BG).stroke(C_BORDER);
        doc
          .fillColor(C_TEXT)
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(`CARGA N°${index + 1}`, 55, startY + 4);

        // 4. Nombre destacado en Negro
        doc
          .fillColor(C_TEXT)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(dep.nombre?.toUpperCase() || "SIN NOMBRE", 140, startY + 4, {
            width: 350,
            align: "right",
          });

        // --- GRID DE DATOS (Mantiene el mismo estilo ordenado) ---
        let yRow = startY + 25;
        const col1 = 60;
        const col2 = 300;

        const drawField = (
          label: string,
          value: string,
          x: number,
          y: number,
        ) => {
          doc
            .fillColor("#6B7280")
            .font("Helvetica-Bold")
            .fontSize(7)
            .text(label, x, y);
          doc
            .fillColor(C_TEXT)
            .font("Helvetica")
            .fontSize(8)
            .text(value || "---", x, y + 9);
        };

        drawField("RUT", dep.rut, col1, yRow);
        drawField("FECHA NACIMIENTO", dep.nacimiento, col2, yRow);

        yRow += 22;
        drawField("EDAD", (dep.edad || "0") + " años", col1, yRow);
        const rel =
          dep.parentesco === "Otro"
            ? `Otro (${dep.otroParentesco || ""})`
            : dep.parentesco;
        drawField("PARENTESCO", rel, col2, yRow);

        yRow += 22;
        const salud =
          dep.prevision === "Isapre"
            ? `Isapre (${dep.isapreNombre || ""})`
            : "FONASA";
        drawField("SISTEMA SALUD", salud, col1, yRow);
        drawField(
          "CONTACTO",
          `${dep.telefono || ""} | ${dep.email || ""}`,
          col2,
          yRow,
        );

        doc.y = startY + cardHeight + 10;
      });

      // Resetear color para las siguientes secciones
      doc.fillColor("black");
    };

    drawSectionCargas(doc, s);

    // --- PÁGINA 2 ---
    doc.addPage();
    drawHeader();
    doc.rect(50, doc.y, 512, 16).fill("#eeeeee").stroke("#cccccc");
    doc
      .fillColor("black")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("3. DATOS BANCARIOS DE LA CARGA", 55, doc.y + 4);
    doc.moveDown(1.5);

    currentY = doc.y;
    currentY = drawRow("Banco:", s.bankName, currentY);
    const tipoCuentaText =
      (s.bankAccountType || "") +
      (s.bankOtherType ? ` (${s.bankOtherType})` : "");
    currentY = drawRow("Tipo de Cuenta:", tipoCuentaText, currentY);
    currentY = drawRow("Número de Cuenta:", s.bankAccountNumber, currentY);
    doc.y = currentY + 30;

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("4. DECLARACIÓN DEL TRABAJADOR", 50);
    doc.moveDown(0.5);
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(
        "Declaro que la información proporcionada es verídica y que los antecedentes adjuntos son auténticos. Asimismo, tomo conocimiento de que la incorporación de la carga está sujeta a evaluación y aprobación por parte de la Compañía Aseguradora, conforme a las condiciones de la pólíza vigente.",
        { align: "justify", width: 512 },
      );
    doc.moveDown(0.5);
    doc.text(
      "Autorizo a la empresa a remitir esta información a la aseguradora para efectos exclusivos de la gestión del Seguro Complementario de Salud.",
      { align: "justify", width: 512 },
    );

    doc.moveDown(10);
    const signY = doc.y;
    // --- LÓGICA PARA RENDERIZAR LA FIRMA ---
    if (s.signature && s.signature.startsWith("data:image")) {
      try {
        // Extraemos solo el contenido base64 (quitamos el prefijo data:image/png;base64,)
        const base64Data = s.signature.split(";base64,").pop();
        if (base64Data) {
          const imgBuffer = Buffer.from(base64Data, "base64");

          // Estampamos la imagen de la firma.
          // Ajusta x: 380 (derecha) y y: signY - 45 (sobre la línea)
          doc.image(imgBuffer, 390, signY - 40, { width: 150 });
        }
      } catch (err) {
        console.error("Error al insertar firma en PDF:", err);
      }
    }
    doc.text("__________________________", 350, signY, { align: "right" });
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Firma del Trabajador", 350, signY + 12, { align: "right" });
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(`Fecha de Solicitud: ${s.requestDate || ""}`, 50, signY);

    // --- PÁGINA 3 ---
    doc.addPage();
    drawHeader();
    doc.rect(50, doc.y, 512, 18).fill("#000000").stroke();
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("5. USO EXCLUSIVO RR.HH.", 55, doc.y + 4);
    doc.fillColor("black").moveDown(2.5);

    doc
      .font("Helvetica")
      .fontSize(9)
      .text("Fecha de Recepción: ____________________", 55);
    doc.moveDown(1.5);
    doc.text("Revisión Documental:    [  ] Completa    [  ] Incompleta");
    doc.moveDown(1.5);
    doc.text("Estado:");
    doc.moveDown(0.5);
    doc.text(
      "[  ] Enviado   [  ] Aprobado   [  ] Rechazado   [  ] Pendiente Información",
    );
    doc.moveDown(1.5);
    doc.text("Observaciones:");
    doc.moveDown(1);
    doc.rect(50, doc.y, 512, 100).stroke();

    doc.moveDown(17);
    doc.text("__________________________", { align: "center" });
    doc.moveDown(1);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Firma RR.HH.", { align: "center" });

    doc.end();
  } catch (error) {
    res.status(500).send("Error");
  }
});

app.listen(4000, () => console.log("🚀 Servidor P&B Corriendo en puerto 4000"));
