import { Body } from 'planck';
import { Graphics } from 'pixi.js';
import { PhysicsWorld } from './PhysicsWorld';

export abstract class Entity {
  bodies: Body[] = [];
  graphics: Graphics[] = [];
  id: string;
  world!: PhysicsWorld; // Definitely assigned in constructor

  constructor(id: string, world: PhysicsWorld) {
    this.id = id;
    this.world = world;
  }

  abstract update(deltaTime: number): void;
  abstract render(): void;
  abstract destroy(): void;
  abstract getBodyPartAt(x: number, y: number): any;
}
