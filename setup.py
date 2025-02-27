from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="ggroid",
    version="0.1.0",
    author="Arti",
    author_email="dev@example.com",
    description="Star Wars droid sound modulation for GGWave",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/ggroid",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.6",
    install_requires=[
        "numpy>=1.21.0",
        "scipy>=1.7.0",
        "pyaudio>=0.2.11",
    ],
    entry_points={
        "console_scripts": [
            "ggroid=src.ggroid:main",
        ],
    },
)