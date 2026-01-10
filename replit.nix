{ pkgs }: {
  deps = [
    pkgs.chromium
    pkgs.util-linux
    pkgs.libuuid
    pkgs.pkg-config
    pkgs.librsvg
    pkgs.giflib
    pkgs.libjpeg
    pkgs.pango
    pkgs.cairo
    pkgs.nodejs_20
  ];
}
