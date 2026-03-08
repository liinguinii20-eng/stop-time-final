// Funciones simuladas para tu nueva base de datos
export const SendEmail = async (data) => console.log("Email simulado:", data);
export const SendSMS = async (data) => console.log("SMS simulado:", data);
export const UploadFile = async (file) => ({ url: "https://via.placeholder.com/150" });
export const InvokeLLM = async (prompt) => "Respuesta simulada de IA";

export const Core = {
    SendEmail,
    SendSMS,
    UploadFile,
    InvokeLLM
};