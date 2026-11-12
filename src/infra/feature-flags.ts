/**
 * Flags de funcionalidad. Se leen de las variables de entorno del proceso cada
 * vez que alguien pregunta, para poder cambiarlas sin reiniciar.
 */
export function isFeatureEnabled(flag: string): boolean {
  return process.env[`FEATURE_${flag}`] === 'true'
}
