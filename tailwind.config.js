module.exports = {
  darkMode: 'class',
  content: [
    "./*.html",
    "./styles/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "var(--color-primary)",
        "primary-container": "var(--color-primary-container)",
        "on-primary": "var(--color-on-primary)",
        "on-primary-container": "var(--color-on-primary-container)",
        "secondary": "var(--color-secondary)",
        "secondary-container": "var(--color-secondary-container)",
        "on-secondary": "var(--color-on-secondary)",
        "on-secondary-container": "var(--color-on-secondary-container)",
        "tertiary": "var(--color-tertiary)",
        "tertiary-container": "var(--color-tertiary-container)",
        "on-tertiary": "var(--color-on-tertiary)",
        "on-tertiary-container": "var(--color-on-tertiary-container)",
        "error": "var(--color-error)",
        "error-container": "var(--color-error-container)",
        "on-error": "var(--color-on-error)",
        "on-error-container": "var(--color-on-error-container)",
        "background": "var(--color-background)",
        "on-background": "var(--color-on-background)",
        "surface": "var(--color-surface)",
        "on-surface": "var(--color-on-surface)",
        "on-surface-variant": "var(--color-on-surface-variant)",
        "surface-container-lowest": "var(--color-surface-container-lowest)",
        "surface-container-low": "var(--color-surface-container-low)",
        "surface-container": "var(--color-surface-container)",
        "surface-container-high": "var(--color-surface-container-high)",
        "surface-container-highest": "var(--color-surface-container-highest)",
        "outline": "var(--color-outline)",
        "outline-variant": "var(--color-outline-variant)",
        "primary-fixed": "var(--color-primary-fixed)",
        "primary-fixed-dim": "var(--color-primary-fixed-dim)",
        "secondary-fixed": "var(--color-secondary-fixed)",
        "secondary-fixed-dim": "var(--color-secondary-fixed-dim)",
        "tertiary-fixed": "var(--color-tertiary-fixed)",
        "tertiary-fixed-dim": "var(--color-tertiary-fixed-dim)",

        // Aliases for missing ones
        "surface-variant": "var(--color-surface-container-highest)",
        "surface-bright": "var(--color-surface-container-lowest)",
        "surface-dim": "var(--color-surface-container-high)",
        "on-secondary-fixed": "var(--color-on-secondary)",
        "on-secondary-fixed-variant": "var(--color-on-secondary-container)",
        "on-primary-fixed": "var(--color-on-primary)",
        "on-primary-fixed-variant": "var(--color-on-primary-container)",
        "on-tertiary-fixed": "var(--color-on-tertiary)",
        "on-tertiary-fixed-variant": "var(--color-on-tertiary-container)",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        full: "9999px"
      },
      fontFamily: {
        headline: ["Lexend"],
        body: ["Lexend"],
        label: ["Lexend"]
      }
    }
  },
  plugins: []
}