from setuptools import setup, find_packages

setup(
    name="pidex-sdk",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "stellar-sdk>=9.0.0",
        "requests>=2.31.0",
    ],
    author="PiDex Developer",
    description="PiDex SDK for Stellar SCP - $314K PI Stablecoin",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
)
