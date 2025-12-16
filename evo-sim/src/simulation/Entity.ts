import { Body } from 'planck';
import { Graphics } from 'pixi.js';

export abstract class Entity {
  bodies: Body[] = [];
  graphics: Graphics[] = [];
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  abstract update(deltaTime: number): void;
  abstract render(): void;
  abstract destroy(): void;
}
