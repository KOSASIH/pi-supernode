package api

import (
	"context"
	"github.com/KOSASIH/pi-supernode/pkg/crypto"
	pb "github.com/KOSASIH/pi-supernode/proto"
)

type ZKService struct {
	pb.UnimplementedZKServiceServer
	threshold *crypto.ThresholdSig
}

func (s *ZKService) GenerateProof(ctx context.Context, req *pb.ProofRequest) (*pb.ProofResponse, error) {
	proof, publicInput, err := crypto.GenerateTxProof(
		uint64(req.Amount),
		uint64(req.Balance),
		req.Signature,
	)
	if err != nil {
		return nil, err
	}
	
	return &pb.ProofResponse{
		Proof:        proof.Serialize(),
		PublicInputs: []*pb.Scalar{publicInput.MarshalText()},
	}, nil
}

func (s *ZKService) VerifyThreshold(ctx context.Context, req *pb.ThresholdRequest) (*pb.ThresholdResponse, error) {
	aggSig, err := s.threshold.AggregateShares(req.Signatures)
	if err != nil {
		return nil, err
	}
	
	return &pb.ThresholdResponse{
		Valid:     true,
		Signature: aggSig.Serialize(),
	}, nil
}
