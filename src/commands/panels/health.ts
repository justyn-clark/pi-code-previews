import { truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";

export class HealthPanel implements Component {
  private readonly text: string;

  constructor(
    text: string,
    private readonly done: (result?: undefined) => void,
    private readonly border: (value: string) => string,
  ) {
    this.text = `${text}\n\nPress any key to close`;
  }

  render(width: number): string[] {
    const frameWidth = Math.max(4, width);
    const innerWidth = frameWidth - 4;
    const content = this.text.split("\n").map((line) => truncateToWidth(line, innerWidth, "…"));
    const empty = this.frameLine("", innerWidth);
    return [
      this.border(`╭${"─".repeat(frameWidth - 2)}╮`),
      empty,
      ...content.map((line) => this.frameLine(line, innerWidth)),
      empty,
      this.border(`╰${"─".repeat(frameWidth - 2)}╯`),
    ];
  }

  invalidate(): void {
    // No cached rendering state.
  }

  handleInput(): void {
    this.done();
  }

  private frameLine(line: string, innerWidth: number): string {
    const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(line)));
    return `${this.border("│")} ${line}${padding} ${this.border("│")}`;
  }
}
