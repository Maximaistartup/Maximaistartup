// ============================================================
// FACET — FACIAL MEASUREMENT ENGINE
// ============================================================

export function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;

    return Math.sqrt(
        dx * dx +
        dy * dy +
        dz * dz
    );
}


// ------------------------------------------------------------
// FACIAL PROPORTIONS
// ------------------------------------------------------------

export function facialWidth(landmarks) {
    return distance(
        landmarks[234],
        landmarks[454]
    );
}


export function facialHeight(landmarks) {
    return distance(
        landmarks[10],
        landmarks[152]
    );
}


export function facialWidthHeight(landmarks) {
    const width = facialWidth(landmarks);
    const height = facialHeight(landmarks);

    if (height === 0) return null;

    return width / height;
}


// ------------------------------------------------------------
// EYES
// ------------------------------------------------------------

export function leftEyeWidth(landmarks) {
    return distance(
        landmarks[33],
        landmarks[133]
    );
}


export function rightEyeWidth(landmarks) {
    return distance(
        landmarks[362],
        landmarks[263]
    );
}


export function averageEyeWidth(landmarks) {
    return (
        leftEyeWidth(landmarks) +
        rightEyeWidth(landmarks)
    ) / 2;
}


export function intercanthalDistance(landmarks) {
    return distance(
        landmarks[133],
        landmarks[362]
    );
}


export function oneEyeApartRatio(landmarks) {
    const intercanthal =
        intercanthalDistance(landmarks);

    const eyeWidth =
        averageEyeWidth(landmarks);

    if (eyeWidth === 0) return null;

    return intercanthal / eyeWidth;
}


export function eyeSeparationRatio(landmarks) {
    const separation =
        intercanthalDistance(landmarks);

    const width =
        facialWidth(landmarks);

    if (width === 0) return null;

    return separation / width;
}


export function interpupillaryDistance(landmarks) {
    return distance(
        landmarks[468],
        landmarks[473]
    );
}


export function interpupillaryFaceRatio(landmarks) {
    const ipd =
        interpupillaryDistance(landmarks);

    const width =
        facialWidth(landmarks);

    if (width === 0) return null;

    return ipd / width;
}


// ------------------------------------------------------------
// NOSE
// ------------------------------------------------------------

export function noseWidth(landmarks) {
    return distance(
        landmarks[98],
        landmarks[327]
    );
}


export function noseFaceRatio(landmarks) {
    const nose =
        noseWidth(landmarks);

    const face =
        facialWidth(landmarks);

    if (face === 0) return null;

    return nose / face;
}


export function noseMouthRatio(landmarks) {
    const nose =
        noseWidth(landmarks);

    const mouth =
        mouthWidth(landmarks);

    if (mouth === 0) return null;

    return nose / mouth;
}


// ------------------------------------------------------------
// MOUTH
// ------------------------------------------------------------

export function mouthWidth(landmarks) {
    return distance(
        landmarks[61],
        landmarks[291]
    );
}


export function mouthFaceRatio(landmarks) {
    const mouth =
        mouthWidth(landmarks);

    const face =
        facialWidth(landmarks);

    if (face === 0) return null;

    return mouth / face;
}


// ------------------------------------------------------------
// DEVIATION / SYMMETRY
// ------------------------------------------------------------

export function noseDeviation(landmarks) {
    const left =
        landmarks[234];

    const right =
        landmarks[454];

    const nose =
        landmarks[4];

    const midline =
        (left.x + right.x) / 2;

    const width =
        Math.abs(right.x - left.x);

    if (width === 0) return null;

    return Math.abs(
        nose.x - midline
    ) / width;
}


export function chinDeviation(landmarks) {
    const left =
        landmarks[234];

    const right =
        landmarks[454];

    const chin =
        landmarks[152];

    const midline =
        (left.x + right.x) / 2;

    const width =
        Math.abs(right.x - left.x);

    if (width === 0) return null;

    return Math.abs(
        chin.x - midline
    ) / width;
}


// ------------------------------------------------------------
// MASTER METRIC CALCULATION
// ------------------------------------------------------------

export function calculateMetrics(landmarks) {

    return {

        facialWidthHeight:
            facialWidthHeight(landmarks),

        facialWidth:
            facialWidth(landmarks),

        facialHeight:
            facialHeight(landmarks),

        oneEyeApart:
            oneEyeApartRatio(landmarks),

        eyeSeparation:
            eyeSeparationRatio(landmarks),

        interpupillaryFace:
            interpupillaryFaceRatio(landmarks),

        noseFace:
            noseFaceRatio(landmarks),

        mouthFace:
            mouthFaceRatio(landmarks),

        noseMouth:
            noseMouthRatio(landmarks),

        noseDeviation:
            noseDeviation(landmarks),

        chinDeviation:
            chinDeviation(landmarks)

    };
}
