export function normalizeCnpj(cnpj: string) {
  return cnpj.replace(/\D/g, '')
}

export function buildSubdomain(companyName: string) {
  return companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}