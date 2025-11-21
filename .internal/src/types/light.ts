import { RgbColor } from "./color";
import { TemplateType } from "./templates";

export interface LightTemplate {
  type: TemplateType.Light;
  color: RgbColor;
  intensity: number;
}
