{
  description = "Simple Flake for GNOME JS extension";
  inputs = {
    nixpkgs = { url = "github:nixos/nixpkgs/nixos-unstable"; };
    flake-utils = { url = "github:numtide/flake-utils"; };
  };
  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          name = "shell with npm, tsc, and glib";
          packages = with pkgs; [
            zip
            nodejs
            nodePackages.npm
            typescript
            glib
            just
          ];
        };
      });
}
