# 🚀 Template: Claude Code + shadcn + UX Pro Max + 21st.dev

Template para proyectos Next.js con las 3 herramientas de diseño preconfiguradas.

## Herramientas incluidas

| Herramienta | Qué hace |
|---|---|
| **shadcn/ui** | Componentes UI pre-construidos |
| **UX Pro Max** | Enseña a Claude a pensar en diseño |
| **21st.dev Magic** | Estilos visuales consistentes |

## Cómo usar

### Proyecto nuevo (PowerShell)

```powershell
# Clona este template
git clone https://github.com/TU_USUARIO/claude-template
cd claude-template

# Crea un proyecto nuevo
.\setup.ps1
```

Te va a pedir el nombre del proyecto y hace todo automáticamente.

### Antes de usar 21st.dev

Edita `.mcp.json` y reemplaza `TU_API_KEY_AQUI` con tu API key de [21st.dev](https://21st.dev).

> **Nota:** Si ya corriste `claude mcp add magic --scope user ...` una vez, no necesitas el `.mcp.json` — el MCP ya está global.

## Lo que instala el script

1. **Next.js** con TypeScript + Tailwind + App Router
2. **shadcn/ui** con configuración por defecto
3. **UX Pro Max** vía `uipro-cli` (archivos `.claude/skills/`)
4. **21st.dev MCP** config local como respaldo

## Requisitos

- Node.js 18+
- PowerShell 5+
