# NIGV
## 目录结构
```
dist: 编译结果
lib: 发布目录
sample: 示例
src: 源代码
	adaptors: 接口目录
		files： 文件接口
		ga4ga: ga4gh接口
		接口脚本
	models: 数据目录
	styles: 样式
	tracks: tracks目录
	utils: 所有的公共工具
		browse.js:  浏览器类，igv是全局的实例
		colors.js: 颜色工具
		utils.js:  小函数集合
	views: view目录
	igv.js: 用于引入各个模块，生成igv实例等
	index.js: 入口文件
test: 测试
```

### 架构
index.js中会示例化IGV类，类中会生成igv对象，所有的和基因组浏览器相关的组件会被挂载在igv对象上，因此，igv对象和IGV不是类与实例的关系，igv仅仅是IGV里创建的一个变量，IGV相当于是igv的容器，包含挂载方法。