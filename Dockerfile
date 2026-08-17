FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        git \
        libomp-dev \
        ninja-build \
    && rm -rf /var/lib/apt/lists/*

RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir \
        "heir_py[python,openfhe]" \
        "openfhe==1.5.1.0.24.4" \
    && git clone --depth 1 --recurse-submodules --branch v1.5.1 \
        https://github.com/openfheorg/openfhe-development.git \
        /opt/openfhe \
    && cmake -S /opt/openfhe -B /opt/openfhe/build \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/usr/local \
        -DBUILD_UNITTESTS=OFF \
        -DBUILD_EXAMPLES=OFF \
        -DBUILD_BENCHMARKS=OFF \
        -DBUILD_EXTRAS=OFF \
        -DGIT_SUBMOD_AUTO=OFF \
        -DWITH_OPENMP=ON \
    && cmake --build /opt/openfhe/build --parallel 2 \
    && cmake --install /opt/openfhe/build

ENV LD_LIBRARY_PATH=/usr/local/lib

WORKDIR /workspace

CMD ["python", "experiment.py"]
