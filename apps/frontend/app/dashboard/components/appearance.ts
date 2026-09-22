export const APPEARANCE_DEFAULTS = {
  fontFamily: "system", textSize: "normal", theme: "system",
  primaryColor: "#4F46E5", secondaryColor: "#0F172A", accentColor: "#10B981", logo: "",
};
export type Appearance = typeof APPEARANCE_DEFAULTS;
export function publishAppearance(boutiqueId: string, appearance: Appearance, saved = false) {
  window.dispatchEvent(new CustomEvent(saved ? "movooraAppearanceSaved" : "movooraAppearancePreview", { detail: { boutiqueId, appearance } }));
}
