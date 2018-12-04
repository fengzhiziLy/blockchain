let fs = require('fs')
let EC = require('elliptic').ec

let ec = new EC('secp256k1')

let keypair = ec.genKeyPair()

function getPub (prv) {
  // 根据私钥算出公钥
  return ec.keyFromPrivate(prv).getPublic('hex').toString()
}

const keys = generateKeys()
// console.log(res)

// 1. 获取公私钥对 （持久化）
function generateKeys () {
  const fileName = './wallet.json'
  try {
    let res = JSON.parse(fs.readFileSync(fileName))
    if (res.prv && res.pub && getPub(res.prv) === res.pub) {
      keypair = ec.keyFromPrivate(res.prv)
      return res
    } else {
      // 验证失败 重新生成
      throw new Error('not valid wallet.json')
    }
  } catch (error) {
    // 文件不存在或者文件内容不合法 重新生成
    const res = {
      prv: keypair.getPrivate('hex').toString(),
      pub: keypair.getPublic('hex').toString()
    }
    fs.writeFileSync(fileName, JSON.stringify(res))
    return res
  }
}
// 2. 签名
function sign ({ from, to, amount, timestamp }) {
  const bufferMsg = Buffer.from(`${timestamp}-${amount}-${from}-${to}`)
  let signature = Buffer.from(keypair.sign(bufferMsg).toDER()).toString('hex')
  return signature
}
// 3. 校验签名
function verity ({ from, to, amount, timestamp, signature }, pub) {
  // 校验是没有私钥的
  const keypairTemp = ec.keyFromPublic(pub, 'hex')
  const bufferMsg = Buffer.from(`${timestamp}-${amount}-${from}-${to}`)
  return keypairTemp.verify(bufferMsg, signature)
}

module.exports = { sign, verity, keys }

// const trans = {from: 'feng', to: 'xiaobai', amount: 100}
// const trans1 = {from: 'feng1', to: 'xiaobai', amount: 100}
// const signature = sign(trans)
// console.log(signature)
// trans1.signature = signature
// const isVerity = verity(trans1, keys.pub)
// console.log(isVerity)
