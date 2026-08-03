# Contenedores y perfiles

Los scripts públicos representan los perfiles del sistema:

| Perfil | Desarrollo | Build | Host publicado | API |
|---|---|---|---|---|
| local | `npm run dev:local` | `npm run build:local` | `http://localhost:5173` | `http://localhost:8080` |
| dev | `npm run dev:dev` | `npm run build:dev` | `https://dev-admin.kefaro.tech` | `https://dev-api.kefaro.tech` |
| prod | `npm run dev:prod` | `npm run build:prod` | `https://admin.vetsoftware.co` | `https://api.vetsoftware.co` |

Los valores de cada perfil viven en `.env.local`, `.env.dev` y `.env.prod`; la tabla debe mantenerse sincronizada con esos archivos.

Vite reserva la palabra `local`, por lo que el script usa internamente el modo técnico `localdev`; la interfaz del proyecto continúa siendo `local/dev/prod` y carga `.env.local`.

El `Dockerfile` construye `prod` por omisión y sirve la SPA con nginx no-root en el puerto 8080. La configuración aplica fallback a `index.html`, compresión, caché prolongada de assets, cabeceras de seguridad y `/health`.

## Despliegue dev en Cloudflare Pages

El perfil dev se publica en el proyecto Pages `vetsoftware-front-dev` (cuenta `Software@kefaro.tech's Account`, zona `kefaro.tech`), con dominio propio `dev-admin.kefaro.tech` y subdominio de respaldo `vetsoftware-front-dev.pages.dev`.

- El proyecto es de tipo *direct upload*: no hay integración de Git, el artefacto lo sube `.github/workflows/deploy-dev.yml` con `wrangler pages deploy dist` en cada push a `develop`.
- El workflow usa el GitHub Environment `development` y exige los secrets `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_API_TOKEN` (token con permiso *Cloudflare Pages: Edit* sobre esa cuenta).
- Las variables `VITE_*` son de build: se resuelven al ejecutar `npm run build:dev` en el runner y no se configuran en Pages.
- `public/_redirects` da el fallback SPA (`/* /index.html 200`) y `public/_headers` replica las cabeceras de seguridad y caché del nginx del contenedor.

No coloque secretos en archivos `VITE_*`: sus valores quedan incluidos en el JavaScript entregado al navegador.
