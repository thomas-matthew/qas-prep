"""Settings, read from the environment (and an optional .env file in the project folder)."""
import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # the project folder (src/qas_prep/ -> project)
PACKAGE = Path(__file__).resolve().parent


def _load_env_file() -> None:
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    data_dir: Path
    tutor_model: str
    keep_backups: int
    use_api_key: bool

    @property
    def db_path(self) -> Path:
        return self.data_dir / "qas.db"

    @property
    def backup_dir(self) -> Path:
        return self.data_dir / "backups"

    @property
    def tutor_dir(self) -> Path:
        """An empty folder the tutor runs in. Claude keeps its session files keyed by this folder,
        so it must stay the same for conversations to resume."""
        return self.data_dir / "tutor"


def load() -> Settings:
    _load_env_file()
    data = Path(os.environ.get("QAS_DATA_DIR", ROOT / "data")).expanduser()
    return Settings(
        host=os.environ.get("QAS_HOST", "0.0.0.0"),
        port=int(os.environ.get("QAS_PORT", "8770")),
        data_dir=data,
        tutor_model=os.environ.get("QAS_TUTOR_MODEL", "sonnet"),
        keep_backups=int(os.environ.get("QAS_KEEP_BACKUPS", "14")),
        use_api_key=os.environ.get("QAS_USE_API_KEY") == "1",
    )
