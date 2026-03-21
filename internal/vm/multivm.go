package vm

import (
    "github.com/ethereum/go-ethereum/core/vm"
    "github.com/CosmWasm/wasmvm"
    "github.com/ethereum/go-ethereum/core/types"
)

type MultiVM struct {
    evm    *vm.EVM
    wasmvm *wasmvm.VM
}

func (m *MultiVM) Execute(tx *types.Transaction, contract string) ([]byte, error) {
    switch contract[:4] {
    case []byte{0x00, 0x61, 0x73, 0x6d}: // WASM magic bytes
        return m.wasmvm.Execute(tx.Data())
    default: // EVM
        return m.evm.Call(vm.AccountRef{}, tx.To(), tx.Data(), 0, 0)
    }
}
