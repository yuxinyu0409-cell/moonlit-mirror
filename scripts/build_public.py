"""Build a static allowlist: backend code and secrets never become public assets."""
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
FILES = (
    'index.html', 'style.css', 'oracle.css', 'app.js', 'spread.js',
    'deck-expansion.js', 'gesture.js', 'hand-worker.js', 'pool.js',
    'cards.js', 'sound.js', 'reading.js', 'magic.js',
)

def build():
    if PUBLIC.exists():
        shutil.rmtree(PUBLIC)
    PUBLIC.mkdir()
    for name in FILES:
        shutil.copy2(ROOT / name, PUBLIC / name)
    shutil.copytree(ROOT / 'assets', PUBLIC / 'assets')
    print('Built public/ from explicit frontend files and assets.')

if __name__ == '__main__':
    build()
