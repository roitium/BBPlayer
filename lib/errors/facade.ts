import { CustomError } from '.'

export class FacadeError extends CustomError {}

export class SyncTaskAlreadyRunningError extends FacadeError {
	constructor() {
		super('同步任务正在进行中，请稍后再试')
	}
}

export class SoBilibiliFuckUError extends FacadeError {
	constructor(ids: string[]) {
		super(
			`Bilibili 隐藏了被 up 设置为仅自己可见的稿件，却没有更新索引，所以你会看到同步到的歌曲数量少于收藏夹实际显示的数量，具体隐藏稿件：${ids.join(',')}`,
		)
	}
}
