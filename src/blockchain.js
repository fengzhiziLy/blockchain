// 迷你区块链
// 区块链的生成，新增，校验
// 交易
// 非对称加密
// 挖矿
// p2p网络


// [
//   {
//     index: 0, 索引
//     timestamp:  时间戳
//     data: 区块的具体信息 主要是交易信息
//     hash: 当前区块信息的哈希 哈希1
//     prevHash: 上一个区块的哈希  哈希2
//     nonce: 随机数
//   },
//   {
//     index: 1, 索引
//     timestamp:  时间戳
//     data: 区块的具体信息 主要是交易信息
//     hash: 当前区块信息的哈希 哈希2
//     prevHash: 上一个区块的哈希  哈希1
//     nonce: 随机数
//   }
// ]


const crypto = require('crypto')
const keys = require('./rsa')
// 创世区块
const initBlock = { 
  index: 0,
  data: 'hello feng-chain!',
  prevHash: '0',
  timestamp: 1543573216287,
  nonce: 28587,
  hash: '000062e279cb1d5b93d10a5b0f8a3d52c9553f3cc95e2d1adeedde3307081981' 
}

class Blockchain {
  constructor () {
    this.blockchain = [
      initBlock
    ]
    this.data = []
    this.difficulty = 4
    // const hash = this.computeHash(0, '0', 1543573216287, 'hello feng-chain!', 2)
    // console.log(hash)
  }
  // 获取最新区块
  getLastBlock () {
    return this.blockchain[this.blockchain.length - 1]
  }

  transfer(from, to, amount) {
    if (from !== '0') {
      // 交易非挖矿
      const blance = this.blance(from)
      if (blance < amount) {
        console.log('not enough blance', from, blance, amount)
        return
      }
    }
    // 签名校验
    const sig = keys.sign({from, to, amount})
    console.log(sig)
    const sigTrans = {from, to, amount, sig}
    this.data.push(sigTrans)
    return sigTrans
  }

  // 查看余额
  blance (address) {
    let blance = 0
    this.blockchain.forEach(block => {
      if (!Array.isArray(block.data)) {
        return
      }
      block.data.forEach(trans => {
        if (address == trans.from) {
          blance -= trans.amount
        }
        if (address == trans.to) {
          blance += trans.amount
        }
      })
    })
    console.log(blance)
    return blance
  }
  
  // 挖矿  其实就是打包交易
  mine (address) {
    // 1. 生成新区块 一页新的记账加入了区块链
    // 2. 不停的算hash 直到符合难度条件 获得记账权 新增区块
    // 挖矿结束 矿工奖励 每次挖矿成功给100
    this.transfer('0', address, 100)
    const newBlock = this.generateNewBlock()
    // 区块合法 并且区块链合法 ==》 新增一个
    if (this.isValidBlock(newBlock) && this.isValidaChain()) {
      this.blockchain.push(newBlock)
      this.data = []
      return newBlock
    } else {
      console.log('Error, Invalid Block', newBlock)
    }
  }
  // 生成新区块
  generateNewBlock () {
    let nonce = 0
    const index = this.blockchain.length // 区块的索引值
    const data = this.data
    const prevHash = this.getLastBlock().hash
    let timestamp = new Date().getTime()
    let hash = this.computeHash(index, prevHash, timestamp, data, nonce)
    while (hash.slice(0, this.difficulty) !== '0'.repeat(this.difficulty)) {
      nonce += 1
      hash = this.computeHash(index, prevHash, timestamp, data, nonce)
    }
    return {
      index,
      data,
      prevHash,
      timestamp,
      nonce,
      hash
    }
  }
  computeHashForBlock({index, prevHash, timestamp, data, nonce}) {
    return this.computeHash(index, prevHash, timestamp, data, nonce)
  }
  // 计算哈希
  computeHash (index, prevHash, timestamp, data, nonce) {
    return crypto.createHash('sha256').update(index + prevHash + timestamp + data + nonce).digest('hex')
  }
  // 校验区块
  isValidBlock (newBlock, lastBlock = this.getLastBlock()) {
    // 1. 区块的index等于最新区块的index+1
    // const lastBlock = this.getLastBlock()
    // 2. 区块的time大于最新区块
    // 3. 区块的prevHash等于最新区块的hash
    // 4. 区块的哈希值 符合难度要去
    // 5. 新区块的哈希值计算正确
    if (newBlock.index !== lastBlock.index + 1) {
      return false
    } else  if(newBlock.timestamp <= lastBlock.timestamp) {
      return false
    } else if (newBlock.prevHash !== lastBlock.hash) {
      return false
    } else if (newBlock.hash.slice(0, this.difficulty) !== '0'.repeat(this.difficulty)) {
      return false
    } else if (newBlock.hash !== this.computeHashForBlock(newBlock)) {
      return false
    }
    return true
  }
  // 校验区块链
  isValidaChain (chain = this.blockchain) {
    // 除创世区块的区块
    for (let i = chain.length - 1; i >= 1; i = i - 1) {
      if (!this.isValidBlock(chain[i], chain[i - 1])) {
        return false
      }
    }
    if (JSON.stringify(chain[0]) !== JSON.stringify(initBlock)) {
      return false
    }
    return true
  }
}

// let bc = new Blockchain()
// bc.mine()
// // bc.blockchain[1].nonce = 22
// bc.mine()
// bc.mine()
// bc.mine()
// console.log(bc.blockchain)

module.exports = Blockchain