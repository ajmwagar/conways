# 🦀🌱 `conways`

[![Build Status](https://travis-ci.org/ajmwagar/conways.svg?branch=master)](https://travis-ci.org/ajmwagar/conways)

I wanted to learn about WebAssembly + Rust. So I decided to reimplement **Conway's Game of Life**, built with Rust and WebAssembly using
[`wasm-pack`](https://github.com/rustwasm/wasm-pack).

## 🚴 Usage

### 🐑 Use `git clone` to Clone this Repo

```
git clone https://github.com/ajmwagar/conways
cd conways
```

### 🛠️ Build with `wasm-pack build`

```
wasm-pack build
```

### 🔗 Link with `npm link`
```
cd pkg
npm link
cd ../www
npm link conways
```

### 🏃‍♂️ Run with `npm run start`

```
npm run start
```
open `localhost:8080` in your browser

### 🔬 Test in Headless Browsers with `wasm-pack test`

```
wasm-pack test --headless --firefox
```
