/*
  自定义Promise构造函数模块
*/
(function (window) {

  /* 
  定义Promise类
  */
  class Promise {
    /*
      Promise构造函数
      excutor: 同步执行回调函数: (resolve, reject) => {}
    */
    constructor (excutor) {
      const self = this

      // 1. 初始化属性
      self.status = 'pending' // 状态属性, 初始值为pending, 后面会改变为: resolved/rejected
      self.data = undefined // 用来保存将来产生了成功数据(value)或/失败数据(reason)
      self.callbacks = [] // 用来存储包含待处理onResolved和onRejected回调函数方法的对象的数组

      // 2. 定义resolve和reject两个函数
      /*
      当异步处理成功后应该立即执行的函数
      value: 需要传递给onResolved函数的成功的值
      内部:
        1. 同步修改状态和保存数据
        2. 异步调用成功的回调函数
       */
      function resolve(value) {

        if (self.status !== 'pending') { // 如果当前不是pending, 直接结束
          return
        }


        // 1. 同步修改状态和保存数据
        self.status = 'resolved'
        self.data = value
        // 2. 异步调用成功的回调函数
        setTimeout(() => {
          self.callbacks.forEach(obj => {
            obj.onResolved(value)
          })
        })
      }

      /*
      当异步处理失败/异常时后应该立即执行的函数
      reason: 需要传递给onRejected函数的失败的值
      内部:
        1. 同步修改状态和保存数据
        2. 异步调用失败的回调函数
       */
      function reject(reason) { // 如果当前不是pending, 直接结束

        if (self.status !== 'pending') {
          return
        }

        // 1. 同步修改状态和保存数据
        self.status = 'rejected'
        self.data = reason
        // 2. 异步调用失败的回调函数
        setTimeout(() => {
          self.callbacks.forEach(obj => {
            obj.onRejected(reason)
          })
        })
      }

      // 3. 执行excutor,并传入定义好的resolve和reject两个函数
      try {
        excutor(resolve, reject)
      } catch (error) { // 如果excutor函数中抛出异常, 当前promise失败
        reject(error)
      }

    }

    /*
      指定成功和失败后回调函数
      函数的返回值是一个新的promise
    */
    then (onResolved, onRejected) {
      const self = this

      // 如果onResolved/onRejected不是函数, 可它指定一个默认的函数
      onResolved = typeof onResolved === 'function' ? onResolved : value => value // 指定返回的promise为一个成功状态, 结果值为 value
      onRejected = typeof onRejected === 'function' ? onRejected : reason => {
        throw reason
      } // 指定返回的promise为一个失败状态, 结果值为reason

      // 返回一个新的promise对象
      return new Promise((resolve, reject) => {

        /* 
        专门抽取的用来处理promise成功/失败结果的函数
        callback: 成功/失败的回调函数
        */
        function handle(callback) {
          // 1. 抛出异常  ===> 返回的promise变为rejected
          try {
            const x = callback(self.data)
            // 2. 返回一个新的promise ===> 得到新的promise的结果值作为返回的promise的结果值
            if (x instanceof Promise) {
              x.then(resolve, reject) // 一旦x成功了, resolve(value), 一旦x失败了: reject(reason)
            } else {
              // 3. 返回一个一般值(undefined) ===> 将这个值作为返回的promise的成功值
              resolve(x)
            }
          } catch (error) {
            reject(error)
          }
        }

        if (self.status === 'resolved') { // 当前promise已经成功了
          setTimeout(() => {
            handle(onResolved)
          })
        } else if (self.status === 'rejected') { // 当前promise已经失败了
          setTimeout(() => {
            handle(onRejected)
          })
        } else { // 当前promise还未确定 pending
          // 将onResolved和onRejected保存起来
          self.callbacks.push({
            onResolved(value) {
              handle(onResolved)
            },
            onRejected(reason) {
              handle(onRejected)
            }
          })
        }
      })
    }
    

    /*
      方法返回一个Promise，并且处理拒绝的情况。它的行为与调用Promise.prototype.then(undefined, onRejected) 相同
      then()的语法糖
    */
    catch (onRejected) {
      return this.then(null, onRejected)
    }

    /*
      返回一个以给定值解析后的Promise 对象
      value也可能是一个promise
    */
    static resolve (value) {
      return new Promise((resolve, reject) => {
        if (value instanceof Promise) { // 如果value是一个promise, 取这个promise的结果值作为返回的promise的结果值
          value.then(resolve, reject) // 如果value成功, 调用resolve(val), 如果value失败了, 调用reject(reason)
        } else {
          resolve(value)
        }
      })
    }

    /* 
      返回一个延迟指定时间才确定结果的promise对象
    */
    static resolveDelay (value, time) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (value instanceof Promise) { // 如果value是一个promise, 取这个promise的结果值作为返回的promise的结果值
            value.then(resolve, reject) // 如果value成功, 调用resolve(val), 如果value失败了, 调用reject(reason)
          } else {
            resolve(value)
          }
        }, time);
      })
    }

    /*
      返回一个带有拒绝原因reason参数的Promise对象。
    */
    static reject (reason) {
      return new Promise((resolve, reject) => {
        reject(reason)
      })
    }

    /*
      返回一个延迟指定时间才失败的Promise对象。
    */
    static rejectDelay = function (reason, time) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(reason)
        }, time)
      })
    }

    /*
      返回一个 Promise 实例
      只有当promises中所有的都成功了, 返回的promise才成功, 只要有一个失败, 返回的promise就失败了
    */
    static all (promises) {
      return new Promise((resolve, reject) => {

        let resolvedCount = 0 // 用来保存已成功的个数
        const promisesLength = promises.length // 所有待处理promise个数
        const values = new Array(promisesLength) // 存储所有成功value的数组
        promises.forEach((p, index) => {
          (function (index) {
            // promises中元素可能不是promise对象, 需要用resolve()包装一下
            Promise.resolve(p).then(
              value => {
                values[index] = value // 保存到values中对应的下标
                resolvedCount++
                // 如果全部成功了, resolve(values)
                if (resolvedCount === promisesLength) {
                  resolve(values)
                }
              },
              reason => {
                // 只要一个失败了, reject(reason)
                reject(reason)
              }
            )
          })(index)
        })
      })
    }

    /*
      返回一个 promise，一旦某个promise解决或拒绝， 返回的 promise就会解决或拒绝。
    */
    static race (promises) {
      // 返回新的promise对象
      return new Promise((resolve, reject) => {
        // 遍历所有promise
        for (var i = 0; i < promises.length; i++) {
          Promise.resolve(promises[i]).then(
            (value) => { // 只要有一个成功了, 返回的promise就成功了
              resolve(value)
            },
            (reason) => { // 只要有一个失败了, 返回的结果就失败了
              reject(reason)
            }
          )
        }
      })
    }
  }

  // 向外暴露Promise
  window.Promise = Promise
})(window)