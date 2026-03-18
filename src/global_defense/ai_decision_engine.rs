use tract_onnx::prelude::*;
use ndarray::Array;

pub struct AIDecisionEngine {
    threat_model: TractModel,
    kill_threshold: f64,
}

impl AIDecisionEngine {
    pub fn new() -> anyhow::Result<Self> {
        let model_bytes = include_bytes!("global_threat_model.onnx");
        let model = tract_onnx::onnx()
            .model_for_path(std::io::Cursor::new(model_bytes))?
            .into_optimized()?
            .into_runnable()?;
        
        Ok(Self {
            threat_model: model,
            kill_threshold: 8.5, // 85% = Execute Kill
        })
    }

    /// Super Intelligence Threat Assessment
    pub async fn assess_threat(&self, node: &PiNodeThreat) -> ThreatAssessment {
        // Neural Network inference
        let input = self.prepare_input(node);
        let result = self.threat_model.run(tvec!(input.into())).unwrap();
        let raw_score: f64 = result[0].to_array_view::<f32>()[[0,0,0,0]] as f64;
        
        let impact_score = (raw_score * 10.0).min(10.0);
        let level = if impact_score > self.kill_threshold {
            GlobalThreatLevel::Apocalyptic
        } else if impact_score > 6.0 {
            GlobalThreatLevel::Critical
        } else if impact_score > 3.0 {
            GlobalThreatLevel::Alert
        } else {
            GlobalThreatLevel::Watch
        };

        ThreatAssessment {
            impact_score,
            level,
            recommendation: self.get_recommendation(impact_score),
        }
    }
}
