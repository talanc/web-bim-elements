import { Line3, Matrix4, Shape, Vector2, Vector3, MathUtils } from 'three';

// Core

export const rad90: number = Math.PI / 2;
export const rad180: number = Math.PI;
export const rad270: number = Math.PI + Math.PI / 2;

export const rad = MathUtils.degToRad;

export function v2(x: number, y: number) {
    return new Vector2(x, y);
}

export function v3(x: number, y: number, z: number) {
    return new Vector3(x, y, z);
}

export function polar(v: Vector2, rad: number, dist: number) {
    v.x += Math.cos(rad) * dist;
    v.y += Math.sin(rad) * dist;
}

export function inters(a1: Vector2, a2: Vector2, b1: Vector2, b2: Vector2, infinite = false): Vector2 | undefined {
    // line containing a1 and a2
    const a3 = v3(a1.x, a1.y, 0).cross(v3(a2.x, a2.y, 0));
    if (a3.lengthSq() === 0) {
        // points are coincident
        return undefined;
    }

    // line containing b1 and b2
    const b3 = v3(b1.x, b1.y, 0).cross(v3(b2.x, b2.y, 0));
    if (b3.lengthSq() === 0) {
        // points are coincident
        return undefined;
    }

    // point where a3 and b3 intersect
    const c3 = a3.clone().cross(b3);
    if (c3.z === 0) {
        // lines are parallel
        return undefined;
    }

    const v = v2(c3.x / c3.z, c3.y / c3.z);

    if (!infinite) {
        const s = (v.x - a1.x) / (a2.x - a1.x);
        if (s < 0 || s > 1) {
            // intersection point is on the line segment
            return undefined;
        }
    }

    return v;
}

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

export interface ShedUser {
    span: number;
    length: number;
    sideBays: number;
    height: number;
    pitch: number;
}

export interface ShedCalc {
    rafter: ElemMaterial;
    column: ElemMaterial;
    roofPurlin: ElemMaterial;
    sideGirt: ElemMaterial;
}

export interface ShedInput {
    user: ShedUser;
    calc: ShedCalc;
}

export class ShedBim {
    columnsLeft: ElemSection[] = [];
    columnsRight: ElemSection[] = [];
    raftersLeft: ElemSection[] = [];
    raftersRight: ElemSection[] = [];
}

function setPortalFrame(input: ShedInput, columnLeft: Line3, columnRight: Line3, rafterLeft: Line3, rafterRight: Line3) {
    const user = input.user;
    const calc = input.calc;

    const pitchRad = rad(user.pitch);

    const columnLeftX = 0 + calc.sideGirt.depth + calc.column.web / 2;

    columnLeft.start.x = columnLeft.end.x = columnLeftX;

    let pos = new Vector2(0, user.height);
    pos.x += calc.sideGirt.depth;
    pos.y += Math.tan(pitchRad) * calc.sideGirt.depth;
    pos.y -= calc.roofPurlin.depth / Math.cos(pitchRad);

    columnLeft.start.z = 0;
    columnLeft.end.z = pos.y;

    pos.x += calc.column.web;
    pos.y += Math.tan(pitchRad) * calc.column.web;

    polar(pos, rad270 + pitchRad, calc.rafter.web / 2);

    rafterLeft.start.x = pos.x;
    rafterLeft.start.z = pos.y;

    pos.x = user.span / 2;
    pos.y = user.height + Math.tan(pitchRad) * user.span / 2;
    pos.y -= (calc.roofPurlin.depth + calc.rafter.web) / Math.cos(pitchRad);
    polar(pos, rad90 + pitchRad, calc.rafter.web / 2);

    rafterLeft.end.x = pos.x;
    rafterLeft.end.z = pos.y;

    const midX = user.span / 2;
    function mirrorValue(value: number) {
        const dist = midX - value;
        return value + dist * 2;
    }
    function mirrorLine(src: Line3, dst: Line3, swap: boolean) {
        dst.start.x = mirrorValue(src.start.x);
        dst.end.x = mirrorValue(src.end.x);
        dst.start.z = src.start.z;
        dst.end.z = src.end.z;
        if (swap) {
            [dst.start.x, dst.end.x] = [dst.end.x, dst.start.x];
            [dst.start.z, dst.end.z] = [dst.end.z, dst.start.z];
        }
    }
    mirrorLine(columnLeft, columnRight, false);
    mirrorLine(rafterLeft, rafterRight, true);
}

class ShedBimBuilder {
    constructor(private input: ShedInput) {
    }

    bim!: ShedBim;

    create() {
        const bim = this.bim = new ShedBim();

        const user = this.input.user;
        const calc = this.input.calc;

        const pitchRad = rad(user.pitch);

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
            const rightColumn = new ElemSection();
            const leftRafter = new ElemSection();
            const rightRafter = new ElemSection();

            bim.columnsLeft.push(leftColumn);
            bim.columnsRight.push(rightColumn);
            bim.raftersLeft.push(leftRafter);
            bim.raftersRight.push(rightRafter);

            leftColumn.line = new Line3();
            rightColumn.line = new Line3();
            leftRafter.line = new Line3();
            rightRafter.line = new Line3();

            // set x/z
            setPortalFrame(this.input, leftColumn.line, rightColumn.line, leftRafter.line, rightRafter.line);

            // set y
            leftColumn.line.start.y = leftColumn.line.end.y =
                rightColumn.line.start.y = rightColumn.line.end.y =
                leftRafter.line.start.y = leftRafter.line.end.y =
                rightRafter.line.start.y = rightRafter.line.end.y = y;

            const rot = i == 0 ? rad270 : rad90;

            // set column rotation
            const trans = new Matrix4();
            trans.makeRotationZ(rot);
            leftColumn.trans = trans.clone();
            rightColumn.trans = trans.clone();

            const leftTrans = new Matrix4();
            leftTrans.multiply(new Matrix4().makeRotationY(rad90 - pitchRad));
            leftTrans.multiply(new Matrix4().makeRotationZ(rot));

            leftRafter.trans = leftTrans;

            const rightTrans = new Matrix4();
            rightTrans.multiply(new Matrix4().makeRotationY(rad90 + pitchRad));
            rightTrans.multiply(new Matrix4().makeRotationZ(rot));

            rightRafter.trans = rightTrans;

            // set material
            leftColumn.mat = rightColumn.mat = calc.column;
            leftRafter.mat = rightRafter.mat = calc.rafter;
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
        v2(x1, y1),
        v2(x4, y1),
        v2(x4, y3),
        v2(x3, y3),
        v2(x3, y2),
        v2(x2, y2),
        v2(x2, y5),
        v2(x3, y5),
        v2(x3, y4),
        v2(x4, y4),
        v2(x4, y6),
        v2(x1, y6),
    ];

    const shape = new Shape(pts);

    return shape;
}