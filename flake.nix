{
  description = "Some Python project";

  inputs = {
    devshell = {
      url = "github:numtide/devshell";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    flake-parts.url = "github:hercules-ci/flake-parts";
    nixpkgs.url = "nixpkgs";
  };

  outputs =
    {
      devshell,
      flake-parts,
      nixpkgs,
      ...
    }@inputs:
    let
      mkFlake = flake-parts.lib.mkFlake;
      projectName = "project-name";
    in
    mkFlake { inherit inputs; } {
      systems = nixpkgs.lib.systems.flakeExposed;
      perSystem =
        {
          system,
          pkgs,
          lib,
          ...
        }:
        {
          _module.args.pkgs = import nixpkgs {
            inherit system;
            config.allowUnfree = true;
            overlays = [
              devshell.overlays.default
            ];
          };
          devShells.default = pkgs.devshell.mkShell {
            name = "${projectName}";
            motd = "{32}${projectName} activated{reset}\n$(type -p menu &>/dev/null && menu)\n";

            env = with pkgs; [
              {
                name = "LD_LIBRARY_PATH";
                value = lib.makeLibraryPath [
                  file
                  stdenv.cc.cc.lib
                ];
              }
            ];

            packages = with pkgs; [
              codex
              gh
              nodejs_25
              python313
              pre-commit
              process-compose
              typescript
            ];

            commands = [
              {
                name = "install-hooks";
                command = ''
                  if [[ -f ".pre-commit-config.yaml" ]]; then
                    pushd $PRJ_ROOT
                    pre-commit install --overwrite --install-hooks
                    popd
                  fi'';
                help = "install or update pre-commit hooks";
              }

              {
                name = "format";
                command = ''
                  pushd $PRJ_ROOT;
                  (ruff format -q ${projectName}/ && isort -q --dt ${projectName}/);
                  popd'';
                help = "apply ruff, isort formatting";
              }

              {
                name = "check";
                command = ''
                  pushd $PRJ_ROOT;
                  echo "${projectName}"
                  (ruff check ${projectName}/ || true);
                  pyright ${projectName}/;

                  if [[ -d "migrations/" ]]; then
                    echo "migrations"
                    (ruff check migrations/ || true);
                    pyright migrations/;
                  fi

                  if [[ -d "tests/" ]]; then
                    echo "tests"
                    (ruff check tests/ || true);
                    pyright tests/;
                  fi
                  popd'';
                help = "run ruff linter, pyright type checker";
              }

              {
                name = "up";
                command = "process-compose up";
                help = "bring up services stack";
              }
            ];
          };
        };
    };
}
