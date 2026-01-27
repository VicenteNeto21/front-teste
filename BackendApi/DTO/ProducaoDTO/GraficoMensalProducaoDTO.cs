namespace BackendApi.Dto.ProducaoDTO
{
    public class GraficoMensalProducaoDTO
    {
        public int Mes { get; set; } // 1 a 12
        public decimal EntradaKg { get; set; }
        public decimal SaidaKg { get; set; }
    }
}
