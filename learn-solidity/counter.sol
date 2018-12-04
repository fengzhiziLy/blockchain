pragma solidity ^0.4.24;

// contract关键字新建合约
contract Counter{
    uint num;
    address owner;
    string name = "feng";
    uint [5] arr = [1, 2, 3, 4, 5];
    arr[1] = 3;
    arr.push(6);
    for (uint i = 0; i < arr.length; i++) {

    }
    mapping(string=>uint) users;
    users["feng"] = 18;
		struct Students{
				uint age;
				uint id;
				string name;
				string phone;
		}
		feng = Students(18, 0, 'feng', '111111111');
		// 0, 1
		enum sex {male, female}
		// sex = 0
    constructor(){
        num = 0;
        // msg.sender 谁部署合约，这个值就是谁
        owner = msg.sender;
    }
    // 声明函数类型
    function increment() public{
        if(owner == msg.sender) {
            num += 1;
        }
    }
    // view只读变量 不写
    // 声明返回值类型
    function getNum() view returns (uint) {
        return num;
    }
}