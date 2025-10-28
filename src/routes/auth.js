// Importación de librerías necesarias
const express = require('express');
const router = express.Router();
const jwt= require('../helpers/jwt'); // Helper para manejo de JSON Web Tokens
const crypto = require('crypto') // Para hashear contraseñas
const nodemailer = require("nodemailer"); // Para envío de emails

// Configuración del transportador de email (NOTA: mover credenciales a .env)
const transporter = nodemailer.createTransport({ 
  host: "cp7161.webempresa.eu", 
  port: 465, 
  secure: true, 
  auth: { 
    user: "projectmaster@renderside.com", 
    pass: "Qaz741!!!" // TODO: Mover a variable de entorno
  } 
});

// Expresión regular para validar formato de email
const emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

/**
 * Ruta para crear un nuevo usuario
 * GET /auth/create/:email/:password/:name
 * NOTA: Esta ruta debería ser POST para mayor seguridad
 * TODO: Hashear la contraseña antes de guardarla en la base de datos
 */
router.route('/create/:email/:password/:name').get( async (request, response, onError ) => {
  try{
    // Log para debug (comentado en producción)
    // console.log("/auth/create/",request.params.email, request.params.password, request.params.name );
    
    // Validar formato del email
    if(!request.params.email.match(emailFormat))  throw {code: -1004, message: 'Invalid email'};
    
    // Verificar si el usuario ya existe
    var ret = await process.db.get("SELECT id FROM Users  WHERE email=?", request.params.email);
    if(ret!=null) throw {code: -1003, message: 'User exists'};
    
    // Crear nuevo usuario en la base de datos
    // NOTA: La contraseña se está guardando en texto plano (PROBLEMA DE SEGURIDAD)
    var ret = await process.db.run("INSERT INTO Users (email, password, lastLogin, name, level, license) VALUES (?,?,datetime('now'),?,0, DATETIME(datetime('now'), '+15 days'))",request.params.email, request.params.password, request.params.name);
    if( ret.changes!=1)  throw {code: -1002, message: 'Cant create user'}; // Corregido mensaje de error
    
    // Obtener los datos del usuario recién creado
    var ret = await process.db.get("SELECT id, name, level, license FROM Users WHERE email=? AND password=?", request.params.email, request.params.password);
    if(ret==null)  throw {code: -1001, message: 'User not found'};
    
    // Generar token JWT y devolver datos del usuario
    return response.header('auth-token', jwt.issue({id:ret.id, level: ret.level},'10d')).json({name:ret.name, level:ret.level, license:ret.license});
  }catch(error){
    // Manejo de errores centralizado
    onError( { code: error.code || -1000, message:  error.message } );
  }      
});

/**
 * Ruta para recuperación de contraseña
 * GET /auth/recovery/:email
 * Genera una nueva contraseña temporal y la envía por email
 */
router.route('/recovery/:email').get( async (request, response, onError ) => {
  try{
    // Log para debug (comentado en producción)
    // console.log("/auth/recovery/",request.params.email);
    
    // Validar formato del email
    if(!request.params.email.match(emailFormat))  throw {code: -1103, message: 'Invalid email'};

    // Verificar que el usuario existe
    var ret = await process.db.get("SELECT id, name FROM Users WHERE email=?", request.params.email);
    if(ret==null) throw {code: -1102, message: 'User email not found'};
    var userName = ret.name;
    
    // Generar una nueva contraseña temporal aleatoria
    const characters = "0123456789abcdefghijklmnopqrstuvwxyz";
    const charactersLength = characters.length;
    var newPass = "";
    for (let i = 0; i < 8; i++) {
      newPass += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    
    // Hashear la nueva contraseña con SHA-1
    // NOTA: SHA-1 está deprecado, considerar usar bcrypt o Argon2
    var newHash = crypto.createHash('sha1').update(newPass).digest('hex');
    
    // Actualizar la contraseña en la base de datos
    var ret = await process.db.run("UPDATE Users SET password=? WHERE id=?", newHash, ret.id);
    if( ret.changes!=1)  throw {code: -1101, message: 'Cant update user password'};
    
    // Enviar email con la nueva contraseña temporal
    const info = await transporter.sendMail({
      from: '"Project Master" <projectmaster@renderside.com>',
      to: request.params.email,
      subject: "Recuperación de la contraseña.",
      text: "Hola "+userName+",\n\nParece que has solicitado una recuperación de contraseña.\n\nPuedes usar esta contraseña temporal "+newPass+"\n\nNo olvides cambiarla!",
      html: "Hola "+userName+",<br><br>Parece que has solicitado una recuperación de contraseña.<br><br>Puedes usar esta contraseña temporal <b>"+newPass+"</b><br><br>No olvides cambiarla!",
    });        
    
    // Respuesta exitosa
    return response.json({code:0 });
  }catch(error){
    // Manejo de errores centralizado
    onError( { code: error.code || -1100, message:  error.message } );
  }      
});

/**
 * Ruta para autenticación/login de usuario
 * GET /auth/:email/:password
 * NOTA: Esta ruta debería ser POST para mayor seguridad
 * TODO: Las contraseñas deberían estar hasheadas en la base de datos
 */
router.route('/:email/:password').get( async (request, response, onError ) => {
  try{
    // Log para debug - ELIMINAR en producción por seguridad
    console.log("/auth/",request.params.email, request.params.password);    
    
    // Validar formato del email
    if(!request.params.email.match(emailFormat))  throw {code: -1203, message: 'Invalid email'};
    
    // Buscar usuario en la base de datos
    // NOTA: Comprobación de licencias eliminada temporalmente
    // var ret = await process.db.get("SELECT id, name, level, license FROM Users WHERE email=? AND password=? AND license>datetime('now')", request.params.email, request.params.password);
    var ret = await process.db.get("SELECT id, name, level, license FROM Users WHERE email=? AND password=?", request.params.email, request.params.password);
    if(ret==null)  throw {code: -1202, message: 'User not found or Bad credentials'}; // Mensaje más genérico por seguridad
    
    // Actualizar timestamp del último login
    var ret2 = await process.db.run("UPDATE Users SET lastLogin=datetime('now') WHERE id=?", ret.id);
    if(ret2.changes!=1) throw {code: -1201, message: 'Cant update lastLogin'};
    
    // Generar token JWT y devolver datos del usuario
    return response.header('auth-token', jwt.issue({id:ret.id, level: ret.level},'10d')).json({
      name: ret.name, 
      level: ret.level, 
      license: ret.license 
    });
  }catch(error){
    // Manejo de errores centralizado
    onError( { code: error.code || -1200, message:  error.message } );
  }      
});


// Exportar el router con las rutas de autenticación
module.exports = { default: router };