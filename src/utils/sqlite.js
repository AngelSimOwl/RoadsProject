// Importación de librerías necesarias
const fs = require("fs"); // Sistema de archivos para verificar existencia de BD
const dbFile = "./.data/roadsproject.db"; // Ruta del archivo de base de datos SQLite
const sqlite3 = require("sqlite3").verbose(); // Driver SQLite3 con logging detallado
const dbWrapper = require("sqlite"); // Wrapper que promisifica sqlite3

/**
 * CONFIGURACIÓN Y INICIALIZACIÓN DE BASE DE DATOS SQLITE
 * 
 * Este módulo:
 * 1. Verifica si la base de datos existe
 * 2. Crea las tablas necesarias si es primera ejecución
 * 3. Inserta datos de prueba/administradores
 * 4. Expone métodos auxiliares para operaciones comunes
 * 
 * Estructura de la base de datos:
 * - Users: Usuarios del sistema con autenticación y licencias
 * - Codes: Códigos temporales para acceso VR
 * - Modules: Progreso de usuarios en módulos educativos
 * - Results: Resultados de simulaciones (Web=1, VR=2)
 */

// Línea comentada para forzar recreación de BD (solo desarrollo)
// if(fs.existsSync(dbFile)) { fs.unlinkSync(dbFile); console.log("Remove BDD"); }

// Verificar si necesitamos crear la estructura de la base de datos
var needToCreateBDD = !fs.existsSync(dbFile);

// Abrir conexión a la base de datos SQLite
dbWrapper.open({ filename: dbFile, driver: sqlite3.Database }).then(async dBase => {
    // Hacer la instancia de DB globalmente accesible
    process.db = dBase;
  
    // Códigos comentados para testing/debugging
    // var ret = await process.db.run("UPDATE Users SET license=DATETIME(datetime('now'), '+10 years') WHERE id=5");
    // var ret = await process.db.all("SELECT *, license FROM Users");
    // console.log("usuarios", ret);
  
    try {
        // Más código de testing comentado
        // var ret = await process.db.all("SELECT * FROM Users");
        // console.log(ret);
        // var ret = await process.db.run("UPDATE Users SET level=? WHERE id=?", 999, 5);
      
        // Si es la primera ejecución, crear toda la estructura de la base de datos
        if (needToCreateBDD) {
            // Crear tabla de usuarios con autenticación y control de licencias
            await process.db.run("CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password TEXT, lastLogin DATETIME, name TEXT, level INTEGER, license DATETIME)");
            
            // Crear tabla de códigos temporales para acceso VR
            await process.db.run("CREATE TABLE Codes (code TEXT PRIMARY KEY, used INTEGER, created DATETIME, userid INTEGER, scene INTEGER)");
            
            // Crear tabla de progreso en módulos educativos
            // PRIMARY KEY compuesta (userid, module) evita duplicados
            await process.db.run("CREATE TABLE Modules (userid INTEGER, module INTEGER, progress INTEGER, quizz INTEGER, PRIMARY KEY (userid, module))");
            // await process.db.run("CREATE INDEX Modules_userid ON Modules(userid)"); // Índice para mejorar búsquedas por userid
            
            // Crear tabla de resultados de simulaciones
            // platform: WEB=1, VR=2
            // PRIMARY KEY compuesta (userid, platform, scene) permite un resultado por combinación
            await process.db.run("CREATE TABLE Results (userid INTEGER, platform INTEGER, scene INTEGER, date DATETIME, data TEXT, signals INTEGER, signalsOK INTEGER, distances INTEGER, distancesOK INTEGER, PRIMARY KEY (userid, platform, scene))");
            // await process.db.run("CREATE INDEX Results_userid_ ON Results(userid)"); // Índice para mejorar búsquedas por userid
            
            // INSERCIÓN DE DATOS DE PRUEBA Y USUARIOS ADMINISTRATIVOS
            // NOTA: Las contraseñas están hasheadas con SHA-1
            
            // Usuario 1: gunderwulde@gmail.com (hash de contraseña específica)
            await process.db.run("INSERT INTO Users (email, password, name, level, license) VALUES ('gunderwulde@gmail.com', '2d0adf37f56b2041d6312a54d1e2f7afc6b4f61f', 'Fernando', 999, DATETIME(datetime('now'), '+10 years'))");
            
            // Usuario 2: angel.gil@renderside.com (nivel 999 = superadministrador)
            await process.db.run("INSERT INTO Users (email, password, name, level, license) VALUES ('angel.gil@renderside.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'Angel', 999, DATETIME(datetime('now'), '+10 years'))");
            
            // Usuario 3: alfonso.cortes@ac2sc.es (administrador con licencia extendida)
            await process.db.run("INSERT INTO Users (email, password, name, level, license) VALUES ('alfonso.cortes@ac2sc.es', 'd3a7be047e71b8ec096cbd70f52f834d305fd514', 'Alfonso', 999, DATETIME(datetime('now'), '+10 years'))");
            
            // Código de prueba VR para usuario 1, escena 1
            await process.db.run("INSERT INTO Codes (code, created, userid, scene) VALUES ('661285', datetime('now'), 1, 1)");
            
            // DUPLICADO: Usuario angel.gil@renderside.com (esto creará un registro duplicado)
            // TODO: Eliminar esta línea duplicada
            //await process.db.run("INSERT INTO Users (email, password, name, level, license) VALUES ('angel.gil@renderside.com', '40bd001563085fc35165329ea1ff5c5ecbdbbeef', 'Angel', 999, DATETIME(datetime('now'), '+10 years'))");
            
        }
        
        // Código de testing para verificar usuarios (comentado en producción)
        var ret = await process.db.get("SELECT id, name, level, license FROM Users WHERE email='alfonso.cortes@ac2sc.es'");
        // console.log("ret", ret);
        // var ret = await process.db.run("UPDATE Users SET level=? WHERE id=?", 999, ret.id );
        
    } catch (dbError) {
        // Manejo de errores durante la inicialización de la base de datos
        console.log("ERROR durante inicialización de BD!!!!");
        console.error(dbError);
    }
});

/**
 * MÉTODOS AUXILIARES PARA OPERACIONES COMUNES DE BASE DE DATOS
 * Estos métodos proporcionan una interfaz simplificada para operaciones frecuentes
 * 
 * NOTA: Algunos parámetros están hardcodeados (id=1) y deberían ser dinámicos
 */
module.exports = {
  /**
   * Crear un nuevo usuario en la base de datos
   * @param {string} email - Email del usuario
   * @param {string} pass - Contraseña (debería estar hasheada)
   * @returns {Promise} Resultado de la operación INSERT
   */
  createUser: async (email, pass) => {
    return await process.db.run("INSERT INTO Users (email, password, level) VALUES (?, ?, ?)", email, pass, 1);
  },
  
  /**
   * Activar licencia de usuario desde la fecha actual
   * @param {number} id - ID del usuario (NOTA: actualmente no se usa, hardcodeado a 1)
   * @param {number} days - Número de días de licencia desde HOY
   * @returns {Promise} Resultado de la operación UPDATE
   * 
   * BUG: El parámetro 'id' no se usa, siempre actualiza el usuario con id=1
   */
  activateUser: async (id, days) => {
    var daysParam = '+' + days + ' days';
    // FIXME: Usar el parámetro 'id' en lugar de hardcodear '1'
    return await process.db.run("UPDATE Users SET license=DATETIME(datetime('now'), ?) WHERE id=?", daysParam, 1);
  },
  
  /**
   * Extender licencia existente de usuario
   * @param {number} id - ID del usuario (NOTA: actualmente no se usa, hardcodeado a 1)
   * @param {number} days - Número de días a agregar a la licencia actual
   * @returns {Promise} Resultado de la operación UPDATE
   * 
   * BUG: El parámetro 'id' no se usa, siempre actualiza el usuario con id=1
   */
  extendLicense: async (id, days) => {
    var daysParam = '+' + days + ' days';    
    // FIXME: Usar el parámetro 'id' en lugar de hardcodear '1'
    return await process.db.run("UPDATE Users SET license=DATETIME(license, ?) WHERE id=?", daysParam, 1);
  }
};
