import { Line3, Matrix4, Shape, Vector2, Vector3 } from 'three';

// Core

export const rad90: number = Math.PI / 2;
export const rad180: number = Math.PI;
export const rad270: number = Math.PI + Math.PI / 2;

//
// Elements
//

export class ElemMaterial {
    name = "";
    width = 0;
    height = 0;
    thickness = 0;

    // c
    get web(): number {
        return this.height;
    }
    get flange(): number {
        return this.width;
    }
    lip = 0;

    // th / z
    get depth(): number {
        return this.height;
    }
}

export class ElemSection {
    line!: Line3;
    trans!: Matrix4;
    mat!: ElemMaterial;
}

//
// Shed
//

export class ShedUser {
    span = 0;
    length = 0;
    sideBays = 0;
    height = 0;
    pitch = 0;
}

export class ShedCalc {
    column!: ElemMaterial;
    sideGirt!: ElemMaterial;
}

export class ShedInput {
    user!: ShedUser;
    calc!: ShedCalc;
}

export class ShedBim {
    columnsLeft: ElemSection[] = [];
    columnsRight: ElemSection[] = [];
}

class ShedBimBuilder {
    constructor(private input: ShedInput) {
    }

    bim!: ShedBim;

    create() {
        const bim = this.bim = new ShedBim();

        const user = this.input.user;
        const calc = this.input.calc;

        const x1 = 0 + calc.sideGirt.depth + calc.column.web / 2;
        const x2 = user.span - calc.sideGirt.depth - calc.column.web / 2;

        const z1 = 0;
        const z2 = user.height;

        const sideBaySize = user.length / user.sideBays;

        const numFrames = user.sideBays + 1;

        for (let i = 0; i < numFrames; i++) {
            let y = i * sideBaySize;
            if (i == 0) {
                y += calc.column.flange / 2;
            }
            else if (i == numFrames - 1) {
                y -= calc.column.flange / 2;
            }

            const rot = i == 0 ? rad270 : rad90;

            const leftColumn = new ElemSection();
            leftColumn.line = new Line3(new Vector3(x1, y, z1), new Vector3(x1, y, z2));
            leftColumn.trans = new Matrix4();
            leftColumn.trans.makeRotationZ(rot);
            leftColumn.mat = calc.column;
            bim.columnsLeft.push(leftColumn);

            const rightColumn = new ElemSection();
            rightColumn.line = new Line3(new Vector3(x2, y, z1), new Vector3(x2, y, z2));
            rightColumn.trans = new Matrix4();
            rightColumn.trans.makeRotationZ(rot);
            rightColumn.mat = calc.column;
            bim.columnsRight.push(rightColumn);
        }

        return bim;
    }
}

export function createShedBim(input: ShedInput) {
    const builder = new ShedBimBuilder(input);
    const bim = builder.create();
    return bim;
}

export function createC(name: string, web: number, flange: number, lip: number, thickness: number) {
    const c = new ElemMaterial();
    c.name = name;
    c.height = web;
    c.width = flange;
    c.lip = lip;
    c.thickness = thickness;
    return c;
}

export function createTH(name: string, depth: number, width: number, thickness: number) {
    const th = new ElemMaterial();
    th.name = name;
    th.height = depth;
    th.width = width;
    th.thickness = thickness;
    return th;
}

export function V2(x: number, y: number) {
    return new Vector2(x, y);
}

export function V3(x: number, y: number, z: number) {
    return new Vector3(x, y, z);
}

export function createShape(mat: ElemMaterial) {
    const hw = mat.flange / 2 / 1000;
    const hh = mat.web / 2 / 1000;
    const l = mat.lip / 1000;
    const t = mat.thickness / 1000;

    const x1 = -hw;
    const x2 = -hw + t;
    const x3 = +hw - t;
    const x4 = +hw;

    const y1 = -hh;
    const y2 = -hh + t;
    const y3 = -hh + l;
    const y4 = +hh - l;
    const y5 = +hh - t;
    const y6 = +hh;

    const pts = [
        V2(x1, y1),
        V2(x4, y1),
        V2(x4, y3),
        V2(x3, y3),
        V2(x3, y2),
        V2(x2, y2),
        V2(x2, y5),
        V2(x3, y5),
        V2(x3, y4),
        V2(x4, y4),
        V2(x4, y6),
        V2(x1, y6),
    ];

    const shape = new Shape(pts);

    return shape;
}