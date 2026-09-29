const fs = require('fs');
const path = require('path');

// electron-builder afterPack hook: signs the binaries electron-builder leaves alone.
//
// electron-builder itself signs the main exe, .exe/.node files under app.asar.unpacked,
// elevate.exe and the installer. It never walks extraResources (resources/bin), and it only
// signs DLLs if ".dll" is in signExts - but signExts cannot exclude files, so that would also
// overwrite the Microsoft signatures on d3dcompiler_47.dll, dxil.dll and onnxruntime*.dll.
// So DLLs everywhere and executables under resources/bin are handled here, skipping any
// file that already carries a signature.
//
// Runs before electron-builder signs the main exe and before the nsis-web .7z is created,
// so everything signed here ends up inside the installer payload.

function* walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(full);
        else yield full;
    }
}

// True if the PE file already has an embedded Authenticode signature (non-empty security directory).
function hasEmbeddedSignature(file) {
    const fd = fs.openSync(file, 'r');
    try {
        const dos = Buffer.alloc(64);
        fs.readSync(fd, dos, 0, dos.length, 0);
        if (dos.readUInt16LE(0) !== 0x5a4d) return false; // "MZ"

        const pe = Buffer.alloc(264);
        fs.readSync(fd, pe, 0, pe.length, dos.readUInt32LE(0x3c));
        if (pe.readUInt32LE(0) !== 0x00004550) return false; // "PE\0\0"

        // Optional header starts after the 4-byte signature and 20-byte COFF header.
        // Data directories begin at offset 96 (PE32) or 112 (PE32+); security is entry 4.
        const isPe32Plus = pe.readUInt16LE(24) === 0x20b;
        const securityDir = 24 + (isPe32Plus ? 112 : 96) + 4 * 8;
        return pe.readUInt32LE(securityDir + 4) > 0;
    } finally {
        fs.closeSync(fd);
    }
}

exports.default = async function signExtraBinaries(context) {
    if (context.electronPlatformName !== 'win32') return;

    if (!process.env.WIN_CSC_LINK && !process.env.CSC_LINK) {
        console.log('  • sign-extra-binaries: no certificate configured (WIN_CSC_LINK), skipping');
        return;
    }

    const binDir = path.join(context.appOutDir, 'resources', 'bin') + path.sep;
    const candidates = [...walk(context.appOutDir)].filter((file) => {
        const lower = file.toLowerCase();
        return lower.endsWith('.dll') || (lower.endsWith('.exe') && file.startsWith(binDir));
    });

    const toSign = candidates.filter((file) => !hasEmbeddedSignature(file));
    console.log(`  • sign-extra-binaries: signing ${toSign.length} files (${candidates.length - toSign.length} already signed by their vendor)`);

    for (const file of toSign) {
        await context.packager.signIf(file);
    }
};
