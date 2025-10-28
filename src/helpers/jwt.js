// Importación de la librería jsonwebtoken para manejo de tokens JWT
const jwt = require('jsonwebtoken');

/**
 * HELPER PARA MANEJO DE JSON WEB TOKENS (JWT)
 * 
 * Este módulo centraliza la lógica de creación y validación de tokens JWT.
 * Utiliza la clave secreta del archivo .env para firmar y verificar tokens.
 * 
 * Casos de uso:
 * - Generar tokens en login/registro exitoso
 * - Renovar tokens en requests autenticados
 * - Validar tokens en middlewares de autenticación
 * 
 * Seguridad:
 * - Requiere process.env.secret configurado en .env
 * - Tokens firmados con algoritmo HS256 por defecto
 * - Soporte para expiración configurable
 * 
 * Estructura típica del payload:
 * {
 *   id: number,        // ID del usuario
 *   level: number,     // Nivel de acceso del usuario
 *   iat: timestamp,    // Issued at (generado automáticamente)
 *   exp: timestamp     // Expiration (si se especifica expiresIn)
 * }
 */

module.exports = {
  /**
   * Generar un nuevo token JWT
   * 
   * @param {Object} payload - Datos a incluir en el token (id, level, etc.)
   * @param {string|null} expiresIn - Tiempo de expiración (ej: '10d', '2h', '30m')
   *                                  Si es null, el token no expira
   * @returns {string} Token JWT firmado
   * 
   * @example
   * // Token con expiración de 10 días
   * const token = jwt.issue({id: 123, level: 1}, '10d');
   * 
   * // Token sin expiración
   * const permanentToken = jwt.issue({id: 123, level: 999}, null);
   */
  issue(payload, expiresIn){
    // Si se especifica tiempo de expiración, incluirlo en las opciones
    if(expiresIn != null) {
      return jwt.sign(payload, process.env.secret, {expiresIn});
    } else {
      // Token sin expiración (usar con precaución en producción)
      return jwt.sign(payload, process.env.secret);
    }
  },
  
  /**
   * Validar y decodificar un token JWT
   * 
   * @param {string} token - Token JWT a validar
   * @returns {Object} Payload decodificado del token si es válido
   * @throws {Error} JsonWebTokenError si el token es inválido
   * @throws {Error} TokenExpiredError si el token ha expirado
   * @throws {Error} NotBeforeError si el token aún no es válido
   * 
   * @example
   * try {
   *   const decoded = jwt.validate(token);
   *   console.log('User ID:', decoded.id);
   *   console.log('User Level:', decoded.level);
   * } catch (error) {
   *   console.log('Token inválido:', error.message);
   * }
   */
  validate(token){ 
    // Verificar firma y expiración del token
    // Lanza excepción si el token es inválido, expirado o malformado
    return jwt.verify(token, process.env.secret);
  }
}