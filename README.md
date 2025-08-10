<div align="center">
<img src="./assets/images/icon-large.png" alt="logo" width="50" />
<h1>BBPlayer</h1>

![GitHub Release](https://img.shields.io/github/v/release/yanyao2333/bbplayer)
![React Native](https://img.shields.io/badge/React%20Native-20232A?style=flat-square&logo=react&logoColor=sky)

</div>

一款使用 React Native 构建的本地优先的 Bilibili 音频播放器。更轻量 & 舒服的听歌体验，远离臃肿卡顿的 Bilibili 客户端。

## 屏幕截图（老版本的）

|                  首页                  |                   播放器                   |                    播放列表                    |                    搜索                    |                    库页面                    |
| :------------------------------------: | :----------------------------------------: | :--------------------------------------------: | :----------------------------------------: | :------------------------------------------: |
| ![home](./assets/screenshots/home.jpg) | ![player](./assets/screenshots/player.jpg) | ![playlist](./assets/screenshots/playlist.jpg) | ![search](./assets/screenshots/search.jpg) | ![library](./assets/screenshots/library.jpg) |

## 主要功能

- **Bilibili 登录**: 支持通过扫码或手动设置 Cookie 登录。
- **播放源**: 自由添加本地播放列表，登录账号后也可直接访问账号内收藏夹、订阅合集等，兼顾快速与方便。
- **全功能播放器**: 提供播放/暂停、循环、随机、播放队列等功能。
- **搜索**: 智能搜索，随意一条链接或 b23.tv 短链，即可解析实际内容并展示。同时也有收藏夹和本地播放列表内搜索。

## 技术栈

- **框架**: React Native, Expo
- **状态管理**: Zustand
- **数据请求**: React Query
- **UI**: Material Design 3 (React Native Paper)
- **播放库**: React Native Track Player
- **ORM**: Drizzle ORM

## 开源许可

本项目采用 MIT 许可。
