import { Router } from "express";
import rutasSalud from "./salud.js";
import rutasAutenticacion from "./autenticacion.js";
import rutasEmpresas from "./empresas.js";
import rutasEspecies from "./especies.js";
import rutasRelatos from "./relatos.js";
import rutasAfiches from "./afiches.js";
import rutasPaseos from "./paseos.js";
import rutasArchivos from "./archivos.js";

/**
 * Router principal de la API.
 * Centraliza TODAS las rutas del backend en un solo lugar.
 */
const rutasPrincipales = Router();

rutasPrincipales.use("/api", rutasSalud);
rutasPrincipales.use("/api/autenticacion", rutasAutenticacion);
rutasPrincipales.use("/api/empresas", rutasEmpresas);
rutasPrincipales.use("/api/especies", rutasEspecies);
rutasPrincipales.use("/api/relatos", rutasRelatos);
rutasPrincipales.use("/api/afiches", rutasAfiches);
// Envíos de la galería móvil: fotos + track (página pública "El viaje de X en Y").
rutasPrincipales.use("/api/paseos", rutasPaseos);
rutasPrincipales.use("/api/archivos", rutasArchivos);

export default rutasPrincipales;