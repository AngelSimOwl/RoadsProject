// Importación del helper JWT para validación de tokens
const jwt=require('../helpers/jwt');

/**
 * MIDDLEWARE DE VALIDACIÓN DE TOKENS JWT
 * 
 * Este middleware se ejecuta en rutas que requieren autenticación.
 * Valida que el request contenga un token JWT válido en el header 'auth-token'
 * y extrae la información del usuario para usarla en las rutas protegidas.
 * 
 * Uso:
 * - Se aplica a rutas que requieren autenticación
 * - Debe estar antes que otros middlewares de autorización
 * - Popula request.user con los datos del token decodificado
 * 
 * Headers requeridos:
 * - auth-token: Token JWT válido emitido en login o refresh
 */

module.exports = {
  /**
   * Middleware para validar token JWT en requests
   * 
   * @param {Object} request - Objeto request de Express
   * @param {Object} response - Objeto response de Express  
   * @param {Function} next - Función next de Express para continuar al siguiente middleware
   * 
   * @throws {Object} Error con código -8 si no hay token
   * @throws {Object} Error con código -9 si el token es inválido
   */
  validateToken(request, response, next) {
    // Extraer token del header 'auth-token'
    const token = request.header('auth-token');
    
    // Verificar que el token esté presente en el request
    if (!token) {
      throw {code: -8, message: 'Access denied. Token required for: ' + request.originalUrl};
    }
    
    try {    
      // Validar y decodificar el token JWT
      // El helper jwt.validate() verifica la firma y expiración
      request.user = jwt.validate(token);
      
      // Token válido: continuar al siguiente middleware o ruta
      next();
    } catch (error) {
      // Token inválido, expirado o malformado
      throw { code: -9, message: 'Invalid or expired token'};
    }
  }
}