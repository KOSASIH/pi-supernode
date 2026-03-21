package api

type AIGuardianService struct {
	pb.UnimplementedAIGuardianServiceServer
	guardian *ai.AIGuardian
}

func (s *AIGuardianService) AuditToken(ctx context.Context, req *pb.AuditRequest) (*pb.AuditResponse, error) {
	audit, err := s.guardian.AuditToken(ctx, req.Contract, req.Issuer)
	if err != nil {
		return nil, err
	}
	
	return &pb.AuditResponse{
		Approved:  audit.Approved,
		Score:     audit.AuditScore,
		RiskLevel: audit.RiskLevel,
		Reason:    audit.Reason,
	}, nil
}
