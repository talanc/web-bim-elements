//
// Elements
//

import { Line3, Matrix3, Vector3 } from 'three';

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
    trans!: Matrix3;
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

            const leftColumn = new ElemSection();
            leftColumn.line = new Line3(new Vector3(x1, y, z1), new Vector3(x1, y, z2));
            leftColumn.trans = new Matrix3();
            leftColumn.mat = calc.column;
            bim.columnsLeft.push(leftColumn);

            const rightColumn = new ElemSection();
            rightColumn.line = new Line3(new Vector3(x2, y, z1), new Vector3(x2, y, z2));
            rightColumn.trans = new Matrix3();
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