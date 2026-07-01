package com.clinicar.backend.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;

@Service
public class QrCodeService {

    public String gerarQrCodeDataUrl(String texto) {
        try {
            QRCodeWriter writer = new QRCodeWriter();

            BitMatrix bitMatrix = writer.encode(
                    texto,
                    BarcodeFormat.QR_CODE,
                    260,
                    260
            );

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            MatrixToImageWriter.writeToStream(
                    bitMatrix,
                    "PNG",
                    outputStream
            );

            String base64 = Base64
                    .getEncoder()
                    .encodeToString(outputStream.toByteArray());

            return "data:image/png;base64," + base64;

        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar QR Code MFA.", e);
        }
    }
}