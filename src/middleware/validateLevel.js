/**
 * MIDDLEWARES DE VALIDACIÓN DE NIVELES DE USUARIO
 * 
 * Este módulo contiene middlewares para validar los niveles de acceso de usuarios.
 * Debe usarse DESPUÉS del middleware validateToken, ya que requiere request.user.
 * 
 * Jerarquía de niveles:
 * - Nivel 0-10: Usuarios básicos
 * - Nivel 11+: Supervisores (pueden gestionar licencias y ver resultados)
 * - Nivel 101+: Masters/Administradores (máximo nivel de acceso)
 * 
 * Los niveles altos incluyen automáticamente los permisos de niveles inferiores.
 * 
 * Uso típico:
 * router.use('/admin', validateToken, validateSupervisorLevel, adminRoutes);
 * router.use('/master', validateToken, validateMasterLevel, masterRoutes);
 */

module.exports = {
  /**
   * Middleware para validar nivel de Supervisor
   * 
   * Requiere que el usuario tenga nivel superior a 10 para acceder a rutas protegidas.
   * Este nivel permite gestionar licencias, ver resultados de todos los usuarios,
   * y realizar operaciones administrativas básicas.
   * 
   * @param {Object} request - Objeto request de Express (debe contener request.user del validateToken)
   * @param {Object} response - Objeto response de Express
   * @param {Function} next - Función next para continuar al siguiente middleware
   * 
   * @requires validateToken debe ejecutarse antes para poblar request.user
   * @throws {Object} Error con código -6 si el nivel es insuficiente
   */
  validateSupervisorLevel(request, response, next) {
    // Verificar que el nivel del usuario sea mayor a 10 (Supervisor)
    if(request.user.level > 10) {
      // Nivel suficiente: continuar al siguiente middleware o ruta
      next();
    } else {
      // Log de intento de acceso no autorizado para auditoría
      console.log(`Access denied - User level ${request.user.level} < required 11 (Supervisor) for ${request.originalUrl}`);
      
      // Rechazar acceso con error específico
      throw {code: -6, message: 'Insufficient user level (Supervisor required).'};
    }
  },
  /**
   * Middleware para validar nivel de Master/Administrador
   * 
   * Requiere que el usuario tenga nivel superior a 100 para acceder a rutas de máximo privilegio.
   * Este nivel permite operaciones críticas como gestión completa del sistema,
   * configuración avanzada, y acceso a funciones de administración total.
   * 
   * @param {Object} request - Objeto request de Express (debe contener request.user del validateToken)
   * @param {Object} response - Objeto response de Express
   * @param {Function} next - Función next para continuar al siguiente middleware
   * 
   * @requires validateToken debe ejecutarse antes para poblar request.user
   * @throws {Object} Error con código -7 si el nivel es insuficiente
   */
  validateMasterLevel(request, response, next) {
    // Verificar que el nivel del usuario sea mayor a 100 (Master)
    if(request.user.level > 100) {
      // Nivel suficiente: continuar al siguiente middleware o ruta
      next();
    } else {
      // Log de intento de acceso no autorizado para auditoría
      console.log(`Access denied - User level ${request.user.level} < required 101 (Master) for ${request.originalUrl}`);
      
      // Rechazar acceso con error específico
      throw {code: -7, message: 'Insufficient user level (Master required).'};
    }
  }

}