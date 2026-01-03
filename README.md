

## 保持最新版本依赖
1. 安装npm-check-updates
   ```bash
   npm install -g npm-check-updates
   ```
2. 检查并更新
```bash
ncu --dep dev       # 检查可更新的开发依赖
ncu --dep dev -u    # 更新开发依赖到最新版本
```
3. 安装更新后的依赖
```bash
npm install
```
