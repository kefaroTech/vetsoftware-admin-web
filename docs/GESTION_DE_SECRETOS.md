# Gestión de secretos

Los valores `VITE_*` terminan en el navegador y nunca deben considerarse secretos. Las credenciales de servidor pertenecen al backend o a GitHub Environments, no a este repositorio.

- Copie `.env.local.example` como `.env.local`; la copia real está ignorada por Git y Docker.
- `.env.dev` y `.env.prod` solo contienen configuración pública versionable.
- El pre-commit ejecuta Gitleaks sobre el contenido staged y bloquea el commit si Docker no está disponible o aparece un hallazgo.
- El workflow `Secret history scan` revisa el historial en cada push y pull request.
- Configure `Secret history scan` como required check y habilite Secret scanning/Push protection en GitHub.
