package crypto

import (
	"github.com/consensys/gnark-crypto/ecc"
	bn256 "github.com/consensys/gnark-crypto/ecc/bn254"
	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/frontend/cs/r1cs"
	"github.com/consensys/gnark/std/hash"
)

// ZK Circuit for transaction validity
type TxValidityCircuit struct {
	Amount    frontend.Variable `gnark:",secret"`
	Balance   frontend.Variable `gnark:",public"`
	Signature frontend.Variable `gnark:",secret"`
}

func (circuit *TxValidityCircuit) Define(api frontend.API) error {
	// Check balance >= amount
	api.AssertIsLessOrEqual(circuit.Amount, circuit.Balance)
	
	// Verify signature (simplified)
	h := hash.Mimc.New(api, bn256.ID)
	h.Write(circuit.Amount)
	msgHash := h.Sum()
	
	// Mock signature verification
	api.AssertIsEqual(circuit.Signature, msgHash)
	
	return nil
}

func GenerateTxProof(amount, balance uint64, signature []byte) (groth16.Proof, *bn256.Scalar, error) {
	// Compile circuit
	ccs, err := frontend.Compile(ecc.BN254.ScalarField(), r1cs.NewBuilder(), &TxValidityCircuit{})
	if err != nil {
		return nil, nil, err
	}
	
	// Setup
	pk, vk, err := groth16.Setup(ccs)
	if err != nil {
		return nil, nil, err
	}
	
	// Witness
	assignment := &TxValidityCircuit{
		Amount:    amount,
		Balance:   balance,
		Signature: signature,
	}
	witness, err := frontend.NewWitness(assignment, ecc.BN254.ScalarField())
	if err != nil {
		return nil, nil, err
	}
	
	// Prove
	proof, err := groth16.Prove(ccs, pk, witness)
	if err != nil {
		return nil, nil, err
	}
	
	publicWitness, err := witness.Public()
	return proof, publicWitness.(*bn256.Scalar), err
}

func VerifyTxProof(proof groth16.Proof, publicData *bn256.Scalar, vk groth16.VerifyingKey) error {
	return groth16.Verify(proof, vk, publicData)
}
