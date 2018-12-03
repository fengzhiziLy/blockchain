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
const dgram = require('dgram')
const rsa = require('./rsa')

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
    // 所有的网络节点信息， address port
    this.peers = []
    this.remote = {}
    // 种子节点
    this.seed = {port: 8001, address: 'localhost'}
    this.udp = dgram.createSocket('udp4')
    this.init()
    // const hash = this.computeHash(0, '0', 1543573216287, 'hello feng-chain!', 2)
    // console.log(hash)
  }
  init () {
    this.bindP2p()
    this.bindExit()
  }
  bindP2p () {
    this.udp.on('message', (data, remote) => {
      const {address, port} = remote
      const action = JSON.parse(data)
      if (action.type) {
        this.dispatch(action, {address, port})
      }
    })
    this.udp.on('listening', () => {
      const address = this.udp.address()
      console.log('[信息]：udp监听完毕 端口是：' + address.port)
    })
    // 区分种子节点和普通节点  普通节点的端口可以变
    // 种子节点的端口必须约定好
    const port = Number(process.argv[2]) || 0
    this.startNode(port)
  }
  bindExit () {
    process.on('exit', () => {
      console.log('[信息]: 再见')
    })
  }
  startNode (port) {
    this.udp.bind(port)
    // 如果不是种子节点， 需要发送一个消息告诉种子，我来了
    if (port !== 8001) {
      this.send({
        type: 'newpeer'
      }, this.seed.port, this.seed.address)
      // 把种子节点加入到本地节点中
      this.peers.push(this.seed)
    }
  }
  send(message, port, address) {
    // console.log('send', message, port, address)
    this.udp.send(JSON.stringify(message), port, address)
  }
  boardcast (action) {
    // 广播全场
    this.peers.forEach(v => {
      this.send(action, v.port, v.address)
    })
  }
  dispatch (action, remote) {
    // 接受的网络消息
    // console.log('接受到P2P网络的消息', action)
    switch(action.type) {
      case 'newpeer':
        // 种子节点要做的事情
        // 1. 你的公网IP和port是什么
        this.send({
          type: 'remoteAddress',
          data: remote
        }, remote.port, remote.address)
        // 2. 现在全部节点的列表
        this.send({
          type: 'peerlist',
          data: this.peers
        }, remote.port, remote.address)
        // 3. 告诉所有已知节点
        this.boardcast({
          type: 'sayhi',
          data: remote
        })
        // 4. 告诉你现在区块链的数据
        this.send({
          type: 'blockchain',
          data: JSON.stringify({
            blockchain: this.blockchain,
            // trans: this.data
          })
        }, remote.port, remote.address)
        this.peers.push(remote)
        console.log('你好啊，新朋友', remote)
        break
      case 'blockchain':
        // 同步区块链
        let allData = JSON.parse(action.data)
        let newChain = allData.blockchain
        this.replaceChain(newChain)
        break
      case 'remoteAddress':
        // 存储远程消息  退出的时候用
        this.remote = action.data
        break
      case 'peerlist':
        // 远程告诉我现在的节点列表
        const newPeers = action.data
        this.addPeers(newPeers)
        break
      case 'sayhi':
        let remotePeer = action.data
        this.peers.push(remotePeer)
        console.log('[信息] 新朋友你好，请你和咖啡')
        this.send({type: 'hi', data: 'hi'}, remotePeer.port, remotePeer.address)
        break
      case 'hi':
        console.log(`${remote.address}: ${remote.port} : ${action.data}`)
        break
      default:
        console.log('这个action不认识')
    }
  }
  isEqualPeer (peer1, peer2) {
    return peer1.address == peer2.address && peer1.port == peer2.port
  }
  addPeers(peers) {
    peers.forEach(peer => {
      // 新节点如果不存在就添加一个到peers
      if (!this.peers.find(v => this.isEqualPeer(peer, v))) {
        this.peers.push(peer)
      }
    })
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
    const sig = rsa.sign({from, to, amount})
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
  isValidTransfer(trans) {
    // 是不是合法的转账
    // 地址即是公钥
    return rsa.verity(trans, trans.from)
  }
  // 挖矿  其实就是打包交易
  mine (address) {
    // 校验所有交易合法性
    // 只要有不合法就报错
    // if (!this.data.every(v => this.isValidTransfer(v))) {
    //   console.log('trans not valid')
    //   return
    // }
    // 过滤不合法的
    this.data = this.data.filter(v => this.isValidTransfer(v))
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
  replaceChain (newChain) {
    // 先不校验交易
    if (newChain.length === 1) {
      return
    }
    if (this.isValidaChain(newChain) && newChain.length > this.blockchain.length) {
      // 拷贝一份
      this.blockchain = JSON.parse(JSON.stringify(newChain))
    } else {
      console.log('[错误]: 不合法链')
    }
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
