# Contenedores y perfiles

Los scripts públicos representan los perfiles del sistema:

| Perfil | Desarrollo | Build | API |
|---|---|---|---|
| local | `npm run dev:local` | `npm run build:local` | `http://localhost:8080` |
| dev | `npm run dev:dev` | `npm run build:dev` | `https://dev-api.vetsoftware.co` |
| prod | `npm run dev:prod` | `npm run build:prod` | `https://api.vetsoftware.co` |

Vite reserva la palabra `local`, por lo que el script usa internamente el modo técnico `localdev`; la interfaz del proyecto continúa siendo `local/dev/prod` y carga `.env.local`.

El `Dockerfile` construye `prod` por omisión y sirve la SPA con nginx no-root en el puerto 8080. La configuración aplica fallback a `index.html`, compresión, caché prolongada de assets, cabeceras de seguridad y `/health`.

No coloque secretos en archivos `VITE_*`: sus valores quedan incluidos en el JavaScript entregado al navegador.
