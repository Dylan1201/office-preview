# 多阶段构建

# 阶段1: 构建
# 使用阿里云镜像加速
FROM node:20-alpine AS builder

# 设置国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装 pnpm 并配置淘宝镜像
RUN npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com && \
    npm config set registry https://registry.npmmirror.com

WORKDIR /app

# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/vue-docx/package.json ./packages/vue-docx/
COPY packages/vue-excel/package.json ./packages/vue-excel/
COPY packages/vue-pptx/package.json ./packages/vue-pptx/
COPY core/package.json ./core/
COPY examples/vue3-demo/package.json ./examples/vue3-demo/

# 安装依赖
RUN pnpm install

# 复制源代码
COPY packages/ ./packages/
COPY core/ ./core/
COPY examples/vue3-demo/ ./examples/vue3-demo/
COPY tsconfig.base.json tsconfig.json ./

# 构建所有包
RUN pnpm --filter @vue3-office/pptx build
RUN pnpm --filter @vue3-office/docx build
RUN pnpm --filter @vue3-office/excel build

# 构建 demo 应用
WORKDIR /app/examples/vue3-demo
RUN pnpm build

# 阶段2: 生产镜像
FROM nginx:alpine

# 设置国内镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 复制自定义 nginx 配置
COPY examples/vue3-demo/nginx.conf /etc/nginx/nginx.conf

# 复制构建产物
COPY --from=builder /app/examples/vue3-demo/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
