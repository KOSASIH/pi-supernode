// src/mastercard/three_ds.rs - 3DS 2.2 Authentication
use serde::{Deserialize, Serialize};
use crate::mastercard::{PaymentTransaction, PaymentStatus};

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct ThreeDSToken {
    pub acs_transaction_id: String,
    pub ds_transaction_id: String,
    pub three_ds_server_trans_id: String,
    pub eci: String,
    pub cavv: String,
    pub xid: String,
    pub status: String, // Y/N/U/A
}

#[derive(Serialize)]
pub struct ThreeDSRequest {
    pub threeDSServerTransID: String,
    pub acsTransID: String,
    pub dsTransID: String,
    pub messageVersion: String,
    pub messageType: String,
}

