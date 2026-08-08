// Fallback apenas para desenvolvimento local (simulador).
// Em celular físico, configure EXPO_PUBLIC_API_URL no .env da raiz com o IP da máquina.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333'
