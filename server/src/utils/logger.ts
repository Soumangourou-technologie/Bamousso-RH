import prisma from "./prisma.js";

export const logToDb = async (level: "INFO" | "WARN" | "ERROR", message: string, details?: any, source?: string) => {
  try {
    console.log('[%s] %s%s', level, source ? `(${source}) ` : "", message, details || "");
    
    await prisma.systemLog.create({
      data: {
        level,
        message,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
        source,
      }
    });
  } catch (error) {
    console.error("Failed to save log to DB:", error);
  }
};

export const logger = {
  info: (message: string, details?: any, source?: string) => logToDb("INFO", message, details, source),
  warn: (message: string, details?: any, source?: string) => logToDb("WARN", message, details, source),
  error: (message: string, details?: any, source?: string) => logToDb("ERROR", message, details, source),
};
